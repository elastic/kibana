/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const logsDefaultPipelineProcessors = [
  {
    set: {
      description: "If '@timestamp' is missing, set it with the ingest timestamp",
      field: '@timestamp',
      override: false,
      copy_from: '_ingest.timestamp',
    },
  },
  {
    pipeline: {
      name: 'logs@json-pipeline',
      ignore_missing_pipeline: true,
    },
  },
  {
    dot_expander: {
      field: '*',
      ignore_failure: true,
    },
  },
  {
    // This is a placeholder for the ECS migration processor - once it exists on the Elasticsearch side, it can be removed here
    script: {
      lang: 'painless',
      source: `
      // Painless script to restructure log/event data, moving specific fields
// into resource.attributes and attributes, and flattening nested objects
// within those two containers.

// Define the recursive flattening function
// - map: The map to flatten
// - prefix: The prefix to prepend to keys (used recursively)
// - result: The map to store the flattened key-value pairs
def flattenMap(Map map, String prefix, Map result) {
  for (entry in map.entrySet()) {
    def key = entry.getKey();
    def value = entry.getValue();
    
    // Construct the new flattened key
    def newKey = (prefix == null || prefix.isEmpty()) ? key : prefix + '.' + key;
    
    // Check if the value is a Map (nested object) and not null
    if (value instanceof Map && value != null) {
      // Recursively call flattenMap for the nested map
      flattenMap((Map)value, newKey, result);
    } else {
      // If it's not a map (or is null), add it directly to the result.
      // Arrays will be kept as is under the flattened key.
      result.put(newKey, value);
    }
  }
    return result;
}


// --- Main Script Logic ---

// Only run initialization if resource.attributes doesn't exist
if (ctx.resource?.attributes == null) {
  // Initialize resource container if it doesn't exist or is null.
  if (ctx.resource == null) {
      ctx.resource = [:];
  }
  // Ensure attributes map exists within resource
  if (ctx.resource.attributes == null) {
     ctx.resource.attributes = [:];
  }
}

// Resource prefixes to look for
def resourcePrefixes = ["host", "cloud", "agent"];

// Process resource attributes based on prefixes
// Create a copy of keyset to avoid ConcurrentModificationException
def keysToProcessResource = new ArrayList(ctx.keySet());
for (def key : keysToProcessResource) {
  // Skip special keys or keys already processed/intended for other locations
  if (key.startsWith("_") || key == "@timestamp" || key == "resource" || key == "message" || key.startsWith("log.")) continue;

  boolean isResourceField = false;

  // Check if the key exactly matches one of our resource prefixes
  if (resourcePrefixes.contains(key)) {
    isResourceField = true;
  } else {
    // Check if the key starts with one of our resource prefixes followed by a dot
    for (def prefix : resourcePrefixes) {
      if (key.startsWith(prefix + ".")) {
        isResourceField = true;
        break;
      }
    }
  }

  if (isResourceField && ctx[key] != null) {
    // Ensure resource.attributes exists before adding
    if (ctx.resource.attributes == null) ctx.resource.attributes = [:];
    ctx.resource.attributes[key] = ctx[key];
    ctx.remove(key);
  }
}

// Process the "message" field.
if (ctx.containsKey("message") && ctx.message != null) {
  // Initialize body if necessary
  if (ctx.body == null) ctx.body = [:];
  ctx.body.text = ctx.message;
  ctx.remove("message");
}

// Process "log.level" field.
if (ctx.log?.level != null) {
  ctx.severity_text = ctx.log.level;
  // Remove level from log, but keep log object if other fields exist
  ctx.log.remove("level");
  // Optional: remove log object if it's now empty
  // if (ctx.log.isEmpty()) { ctx.remove("log"); }
}

// --- Collect remaining top-level fields into ctx.attributes ---
// Initialize attributes map if it doesn't exist
if (ctx.attributes == null) {
    ctx.attributes = [:];
}

// Define reserved/target top-level keys that should NOT be moved to attributes
def reservedKeys = ["@timestamp", "resource", "attributes", "body", "severity_text"];

def keysToMoveToAttributes = new ArrayList();
for (def key : ctx.keySet()) {
    // Check if the key is not reserved and not internal
    if (!reservedKeys.contains(key) && !key.startsWith("_")) {
        // Add fields that were not moved to resource.attributes
        // and are not designated for other locations (like log, message)
        keysToMoveToAttributes.add(key);
    }
}

for (def key : keysToMoveToAttributes) {
    if (ctx[key] != null) { // Check for null value before moving
        ctx.attributes[key] = ctx[key];
        ctx.remove(key);
    } else {
       ctx.remove(key); // Remove top-level null keys as well if desired
    }
}


// --- Flatten Nested Objects in resource.attributes and attributes ---

// Flatten ctx.resource.attributes
if (ctx.resource?.attributes != null && !ctx.resource.attributes.isEmpty()) {
  def flattenedResourceAttrs = [:];
  flattenMap(ctx.resource.attributes, "", flattenedResourceAttrs);
  ctx.resource.attributes = flattenedResourceAttrs; // Replace with flattened map
}

// Flatten ctx.attributes
if (ctx.attributes != null && !ctx.attributes.isEmpty()) {
  def flattenedAttrs = [:];
  flattenMap(ctx.attributes, "", flattenedAttrs);
  ctx.attributes = flattenedAttrs; // Replace with flattened map
}

// Optional: Remove empty top-level objects if they become empty after processing
if (ctx.containsKey("log") && ctx.log.isEmpty()) {
  ctx.remove("log");
}
if (ctx.containsKey("attributes") && ctx.attributes.isEmpty()) {
  ctx.remove("attributes");
}
if (ctx.containsKey("resource") && ctx.resource.isEmpty()) {
  ctx.remove("resource"); // Only remove if resource itself is empty (no attributes, etc.)
} else if (ctx.containsKey("resource") && ctx.resource.attributes != null && ctx.resource.attributes.isEmpty()) {
   ctx.resource.remove("attributes"); // Remove empty attributes map within resource
   // Add check if resource only contained attributes and is now empty
   if (ctx.resource.isEmpty()) {
       ctx.remove("resource");
   }
}
      `,
    },
  },
];
