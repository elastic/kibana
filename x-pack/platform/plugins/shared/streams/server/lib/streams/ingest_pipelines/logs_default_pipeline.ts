/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const getLogsDefaultPipelineProcessors = (isServerless?: boolean) => [
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
  isServerless
    ? {
        // This is a placeholder for the ECS migration - since it's not yet exposed on serverless, we need to handle it via painless script.
        script: {
          lang: 'painless',
          source: `
      if (ctx.resource?.attributes != null) return;
      
      // Initialize resource container.
      ctx.resource = [:];
      ctx.resource.attributes = [:];
      // Resource prefixes to look for
      def resourcePrefixes = ["host", "cloud", "agent"];
      
      // Process resource attributes based on prefixes
      def keysToProcess = new ArrayList(ctx.keySet());
      for (def key : keysToProcess) {
        // Skip special keys
        if (key.startsWith("_") || key == "@timestamp" || key == "resource") continue;
        
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
          ctx.resource.attributes[key] = ctx[key];
          ctx.remove(key);
        }
      }
      // Process the "message" field.
      if (ctx.message != null) {
        ctx.body = [:];
        ctx.body.text = ctx.message;
        ctx.remove("message");
      }
      // Process "log.level" field.
      if (ctx.log?.level != null) {
        ctx.severity_text = ctx.log.level;
        ctx.log.remove("level");
      }
      // Collect any remaining keys into ctx.attributes (except reserved ones) and remove them.
      ctx.attributes = [:];
      def keysToRemove = [];
      for (entry in ctx.entrySet()) {
        if (entry.getKey() != "@timestamp" &&
            entry.getKey() != "resource" &&
            !entry.getKey().startsWith("_") &&
            entry.getKey() != "severity_text" &&
            entry.getKey() != "attributes" &&
            entry.getKey() != "body"
            ) {
          ctx.attributes[entry.getKey()] = entry.getValue();
          keysToRemove.add(entry.getKey());
        }
      }
      for (key in keysToRemove) {
        ctx.remove(key);
      }
      `,
        },
      }
    : {
        // On stateful, we use the normalize_for_stream processor to handle the ECS migration.
        // Later on this will be replaced by the /logs endpoint
        normalize_for_stream: {},
      },
  {
    dot_expander: {
      path: 'resource.attributes',
      field: '*',
      ignore_failure: true,
    },
  },
  {
    dot_expander: {
      path: 'attributes',
      field: '*',
      ignore_failure: true,
    },
  },
];
