/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// =============================================================================
// TYPES
// =============================================================================

/**
 * Represents a feature extracted from log analysis.
 * Matches the schema from @kbn/streams-schema baseFeatureSchema.
 */
export interface ExtractedFeature {
  id: string;
  type: string;
  subtype?: string;
  title?: string;
  description: string;
  properties: Record<string, unknown>;
  confidence: number;
  evidence?: string[];
  tags?: string[];
  meta?: Record<string, unknown>;
}

/**
 * Quality metrics for evaluating feature identification.
 */
export interface FeatureQualityMetrics {
  /** Percentage of features with valid schema (0-1) */
  schemaComplianceRate: number;
  /** How well evidence strings are grounded in source logs (0-1) */
  evidenceGroundingRate: number;
  /** How well confidence levels match evidence quality (0-1) */
  confidenceCalibrationScore: number;
  /** Penalty for duplicate features (0-1, where 1 = no duplicates) */
  deduplicationScore: number;
  /** How well high-cardinality data is placed in meta vs properties (0-1) */
  propertiesUsageScore: number;
  /** Combined quality score (0-1) */
  overallQuality: number;
  /** List of issues found during validation */
  issues: string[];
}

/**
 * Schema validation result for a single feature.
 */
interface SchemaValidationResult {
  valid: boolean;
  errors: string[];
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Valid feature types */
const VALID_FEATURE_TYPES = new Set(['infrastructure', 'technology', 'dependency']);

/** Valid subtypes by type */
const VALID_SUBTYPES: Record<string, Set<string>> = {
  infrastructure: new Set(['cloud_deployment', 'container_orchestration', 'operating_system']),
  technology: new Set([
    'programming_language',
    'web_server',
    'database',
    'logging_library',
    'cache',
    'framework',
    'library',
    'message_queue',
    'search_engine',
    'runtime',
  ]),
  dependency: new Set(['service_dependency', 'api_integration']),
};

/** High-cardinality patterns that should be in meta, not properties */
const HIGH_CARDINALITY_PATTERNS = [
  // IP addresses
  /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
  // IPv6
  /^[0-9a-f:]+$/i,
  // UUIDs
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  // Pod names (kubernetes pattern)
  /^[a-z0-9-]+-[a-z0-9]{5,10}-[a-z0-9]{5}$/i,
  // Instance IDs (various cloud providers)
  /^i-[0-9a-f]{8,17}$/i,
  // Container IDs
  /^[0-9a-f]{12,64}$/i,
  // Hostnames with numeric suffixes
  /^[a-z0-9-]+-\d+$/i,
  // Timestamps
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
  // Request/trace IDs (typically long alphanumeric strings)
  /^[a-zA-Z0-9]{20,}$/,
];

/** Property keys that commonly contain high-cardinality data */
const HIGH_CARDINALITY_PROPERTY_KEYS = new Set([
  'ip',
  'host',
  'hostname',
  'instance_id',
  'instance',
  'pod_name',
  'pod',
  'container_id',
  'container',
  'node',
  'node_name',
  'request_id',
  'trace_id',
  'span_id',
  'session_id',
  'url',
  'endpoint',
  'path',
  'region',
  'zone',
  'availability_zone',
]);

// =============================================================================
// SCHEMA COMPLIANCE VALIDATION
// =============================================================================

/**
 * Validate a single feature against the schema requirements.
 *
 * Checks:
 * - All required fields present (id, type, description, properties, confidence, evidence, tags, meta)
 * - Type is one of: infrastructure, technology, dependency
 * - Subtype uses snake_case and matches expected values for type
 * - Confidence is 0-100
 * - Evidence has 2-5 items
 * - Properties is an object
 */
export const validateFeatureSchema = (feature: ExtractedFeature): SchemaValidationResult => {
  const errors: string[] = [];

  // Check required fields
  if (!feature.id || typeof feature.id !== 'string') {
    errors.push('Missing or invalid id field');
  }

  if (!feature.type || typeof feature.type !== 'string') {
    errors.push('Missing or invalid type field');
  } else if (!VALID_FEATURE_TYPES.has(feature.type)) {
    errors.push(
      `Invalid type "${feature.type}". Must be: infrastructure, technology, or dependency`
    );
  }

  if (!feature.description || typeof feature.description !== 'string') {
    errors.push('Missing or invalid description field');
  }

  if (!feature.properties || typeof feature.properties !== 'object') {
    errors.push('Missing or invalid properties field');
  }

  // Validate confidence range
  if (typeof feature.confidence !== 'number') {
    errors.push('Missing or invalid confidence field');
  } else if (feature.confidence < 0 || feature.confidence > 100) {
    errors.push(`Confidence ${feature.confidence} out of range [0-100]`);
  }

  // Validate evidence count (2-5 items required)
  if (!feature.evidence || !Array.isArray(feature.evidence)) {
    errors.push('Missing or invalid evidence field');
  } else if (feature.evidence.length < 2) {
    errors.push(`Insufficient evidence: ${feature.evidence.length} items (minimum 2 required)`);
  } else if (feature.evidence.length > 5) {
    errors.push(`Too much evidence: ${feature.evidence.length} items (maximum 5 allowed)`);
  }

  // Validate subtype format (snake_case)
  if (feature.subtype) {
    if (!/^[a-z][a-z0-9_]*$/.test(feature.subtype)) {
      errors.push(`Subtype "${feature.subtype}" should use snake_case`);
    }

    // Check if subtype is valid for the type
    const validSubtypes = VALID_SUBTYPES[feature.type];
    if (validSubtypes && !validSubtypes.has(feature.subtype)) {
      // This is a soft warning - we allow unknown subtypes but note them
      // as the spec says "Example subtypes" not exhaustive list
    }
  }

  // Validate tags is an array
  if (feature.tags && !Array.isArray(feature.tags)) {
    errors.push('Invalid tags field - must be an array');
  }

  // Validate meta is an object
  if (feature.meta && typeof feature.meta !== 'object') {
    errors.push('Invalid meta field - must be an object');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Calculate schema compliance rate across all features.
 *
 * @param features - Array of extracted features
 * @returns Tuple of [compliance rate (0-1), list of issues]
 */
export const calculateSchemaComplianceRate = (
  features: ExtractedFeature[]
): { rate: number; issues: string[] } => {
  if (features.length === 0) {
    return { rate: 1.0, issues: [] };
  }

  const issues: string[] = [];
  let validCount = 0;

  for (const feature of features) {
    const result = validateFeatureSchema(feature);
    if (result.valid) {
      validCount++;
    } else {
      issues.push(`Feature "${feature.id}": ${result.errors.join('; ')}`);
    }
  }

  return {
    rate: validCount / features.length,
    issues,
  };
};

// =============================================================================
// EVIDENCE GROUNDING VALIDATION
// =============================================================================

/**
 * Check if an evidence string is grounded in the source documents.
 *
 * Evidence can be:
 * - field.path=value format (e.g., "cloud.provider=aws")
 * - Direct quote from log message
 * - Short description that references actual log content
 */
const isEvidenceGrounded = (
  evidence: string,
  sampleDocuments: Array<Record<string, unknown>>
): boolean => {
  const normalizedEvidence = evidence.toLowerCase().trim();

  // Check for field.path=value format
  const fieldValueMatch = evidence.match(/^([a-z0-9_.]+)\s*=\s*(.+)$/i);
  if (fieldValueMatch) {
    const [, fieldPath, expectedValue] = fieldValueMatch;
    const normalizedExpectedValue = expectedValue.toLowerCase().trim();

    for (const doc of sampleDocuments) {
      const actualValue = getNestedValue(doc, fieldPath);
      if (actualValue !== undefined) {
        const normalizedActualValue = String(actualValue).toLowerCase();
        // Check exact match or contains
        if (
          normalizedActualValue === normalizedExpectedValue ||
          normalizedActualValue.includes(normalizedExpectedValue) ||
          normalizedExpectedValue.includes(normalizedActualValue)
        ) {
          return true;
        }
      }
    }
  }

  // Check if evidence appears in any log message
  for (const doc of sampleDocuments) {
    const message = String(doc.message || '').toLowerCase();
    // Check if significant portion of evidence is in message
    const evidenceWords = normalizedEvidence.split(/\s+/).filter((w) => w.length > 3);

    if (evidenceWords.length > 0) {
      const matchedWords = evidenceWords.filter(
        (word) => message.includes(word) || containsInAnyField(doc, word)
      );
      if (matchedWords.length >= Math.ceil(evidenceWords.length * 0.5)) {
        return true;
      }
    }

    // Also check exact substring match
    if (message.includes(normalizedEvidence)) {
      return true;
    }
  }

  // Check if evidence matches any field value in documents
  for (const doc of sampleDocuments) {
    if (containsInAnyField(doc, normalizedEvidence)) {
      return true;
    }
  }

  return false;
};

/**
 * Get a value from an object using dot notation.
 *
 * Handles both flat keys (e.g., `obj['cloud.provider']`) and nested paths
 * (e.g., `obj.cloud.provider`). Tries flat key first for Elasticsearch/Kibana
 * document compatibility.
 */
const getNestedValue = (obj: Record<string, unknown>, path: string): unknown => {
  // First, try flat key lookup (common in Elasticsearch documents)
  if (path in obj) {
    return obj[path];
  }

  // Then try nested path traversal
  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current;
};

/**
 * Check if a value exists in any field of a document (recursively).
 */
const containsInAnyField = (
  obj: Record<string, unknown>,
  searchValue: string,
  depth = 0
): boolean => {
  if (depth > 5) return false; // Prevent infinite recursion

  for (const value of Object.values(obj)) {
    if (typeof value === 'string' && value.toLowerCase().includes(searchValue)) {
      return true;
    }
    if (typeof value === 'number' && String(value) === searchValue) {
      return true;
    }
    if (typeof value === 'object' && value !== null) {
      if (containsInAnyField(value as Record<string, unknown>, searchValue, depth + 1)) {
        return true;
      }
    }
  }

  return false;
};

/**
 * Calculate evidence grounding rate across all features.
 *
 * @param features - Array of extracted features
 * @param sampleDocuments - Original log documents
 * @returns Tuple of [grounding rate (0-1), list of issues]
 */
export const calculateEvidenceGroundingRate = (
  features: ExtractedFeature[],
  sampleDocuments: Array<Record<string, unknown>>
): { rate: number; issues: string[] } => {
  if (features.length === 0) {
    return { rate: 1.0, issues: [] };
  }

  const issues: string[] = [];
  let totalEvidence = 0;
  let groundedEvidence = 0;

  for (const feature of features) {
    if (!feature.evidence || feature.evidence.length === 0) {
      continue;
    }

    for (const evidence of feature.evidence) {
      totalEvidence++;
      if (isEvidenceGrounded(evidence, sampleDocuments)) {
        groundedEvidence++;
      } else {
        issues.push(`Feature "${feature.id}": Ungrounded evidence "${evidence}"`);
      }
    }
  }

  if (totalEvidence === 0) {
    return { rate: 0, issues: ['No evidence strings found in any feature'] };
  }

  return {
    rate: groundedEvidence / totalEvidence,
    issues,
  };
};

// =============================================================================
// CONFIDENCE CALIBRATION VALIDATION
// =============================================================================

/**
 * Check if a feature is marked as inferred.
 */
const isInferredFeature = (feature: ExtractedFeature): boolean => {
  return feature.tags?.includes('inferred') === true;
};

/**
 * Validate confidence calibration for a single feature.
 *
 * Rules from system prompt:
 * - 90-100: explicit, unambiguous evidence
 * - 70-89: strong patterns with multiple corroborating signals
 * - 50-69: clear indicators with some ambiguity
 * - 30-49: weak inference - must include "inferred" tag
 * - Inferred features (tagged "inferred") must have confidence ≤ 79
 */
const validateConfidenceCalibration = (
  feature: ExtractedFeature
): { valid: boolean; issue?: string } => {
  const { confidence, meta } = feature;
  const isInferred = isInferredFeature(feature);

  // If confidence is 90+, feature should NOT be inferred
  if (confidence >= 90 && isInferred) {
    return {
      valid: false,
      issue: `Feature "${feature.id}" has confidence ${confidence} but is tagged as inferred (max 79 for inferred)`,
    };
  }

  // If feature is inferred, confidence must be ≤ 79
  if (isInferred && confidence > 79) {
    return {
      valid: false,
      issue: `Inferred feature "${feature.id}" has confidence ${confidence} (should be ≤ 79)`,
    };
  }

  // If confidence is 30-49, should be tagged as inferred
  if (confidence >= 30 && confidence <= 49 && !isInferred) {
    return {
      valid: false,
      issue: `Feature "${feature.id}" has weak confidence ${confidence} but is not tagged as inferred`,
    };
  }

  // Inferred features should have meta.notes explaining the inference
  if (isInferred && (!meta || !meta.notes)) {
    return {
      valid: false,
      issue: `Inferred feature "${feature.id}" is missing meta.notes explanation`,
    };
  }

  return { valid: true };
};

/**
 * Calculate confidence calibration score across all features.
 *
 * @param features - Array of extracted features
 * @returns Tuple of [calibration score (0-1), list of issues]
 */
export const calculateConfidenceCalibrationScore = (
  features: ExtractedFeature[]
): { score: number; issues: string[] } => {
  if (features.length === 0) {
    return { score: 1.0, issues: [] };
  }

  const issues: string[] = [];
  let validCount = 0;

  for (const feature of features) {
    const result = validateConfidenceCalibration(feature);
    if (result.valid) {
      validCount++;
    } else if (result.issue) {
      issues.push(result.issue);
    }
  }

  return {
    score: validCount / features.length,
    issues,
  };
};

// =============================================================================
// DEDUPLICATION VALIDATION
// =============================================================================

/**
 * Create a deduplication key from a feature.
 * Key is based on (type, subtype, properties) tuple.
 */
const createDeduplicationKey = (feature: ExtractedFeature): string => {
  const sortedProperties = JSON.stringify(
    Object.keys(feature.properties || {})
      .sort()
      .reduce((acc, key) => {
        acc[key] = feature.properties[key];
        return acc;
      }, {} as Record<string, unknown>)
  );

  return `${feature.type}|${feature.subtype || ''}|${sortedProperties}`;
};

/**
 * Calculate deduplication score.
 *
 * @param features - Array of extracted features
 * @returns Tuple of [deduplication score (0-1), list of issues]
 */
export const calculateDeduplicationScore = (
  features: ExtractedFeature[]
): { score: number; issues: string[] } => {
  if (features.length <= 1) {
    return { score: 1.0, issues: [] };
  }

  const issues: string[] = [];
  const seenKeys = new Map<string, string[]>(); // key -> feature IDs

  for (const feature of features) {
    const key = createDeduplicationKey(feature);
    const existing = seenKeys.get(key);

    if (existing) {
      existing.push(feature.id);
    } else {
      seenKeys.set(key, [feature.id]);
    }
  }

  // Count duplicates
  let duplicateCount = 0;
  for (const [key, ids] of seenKeys.entries()) {
    if (ids.length > 1) {
      duplicateCount += ids.length - 1;
      issues.push(`Duplicate features with key "${key}": ${ids.join(', ')}`);
    }
  }

  // Score: 1 - (duplicates / total)
  const score = 1 - duplicateCount / features.length;

  return {
    score: Math.max(0, score),
    issues,
  };
};

// =============================================================================
// PROPERTIES VS META VALIDATION
// =============================================================================

/**
 * Check if a value looks like high-cardinality data.
 */
const isHighCardinalityValue = (value: unknown): boolean => {
  if (typeof value !== 'string') {
    return false;
  }

  return HIGH_CARDINALITY_PATTERNS.some((pattern) => pattern.test(value));
};

/**
 * Calculate properties usage score.
 *
 * Validates that high-cardinality data (IPs, UUIDs, pod names, etc.)
 * is placed in meta, not properties.
 *
 * @param features - Array of extracted features
 * @returns Tuple of [properties usage score (0-1), list of issues]
 */
export const calculatePropertiesUsageScore = (
  features: ExtractedFeature[]
): { score: number; issues: string[] } => {
  if (features.length === 0) {
    return { score: 1.0, issues: [] };
  }

  const issues: string[] = [];
  let totalProperties = 0;
  let violationCount = 0;

  for (const feature of features) {
    if (!feature.properties) continue;

    for (const [key, value] of Object.entries(feature.properties)) {
      totalProperties++;

      // Check if key suggests high-cardinality data
      const keyLower = key.toLowerCase();
      if (HIGH_CARDINALITY_PROPERTY_KEYS.has(keyLower)) {
        violationCount++;
        issues.push(
          `Feature "${feature.id}": Property "${key}" typically contains high-cardinality data and should be in meta`
        );
        continue;
      }

      // Check if value looks like high-cardinality data
      if (isHighCardinalityValue(value)) {
        violationCount++;
        issues.push(
          `Feature "${feature.id}": Property "${key}" contains high-cardinality value "${value}" that should be in meta`
        );
      }

      // Check for arrays in properties (should often be in meta)
      if (Array.isArray(value) && value.length > 3) {
        violationCount++;
        issues.push(
          `Feature "${feature.id}": Property "${key}" contains array with ${value.length} items - consider moving to meta`
        );
      }
    }
  }

  if (totalProperties === 0) {
    return { score: 1.0, issues: [] };
  }

  // Score: 1 - (violations / total)
  const score = 1 - violationCount / totalProperties;

  return {
    score: Math.max(0, score),
    issues,
  };
};

// =============================================================================
// TYPE-SPECIFIC VALIDATION
// =============================================================================

/**
 * Validate type-specific requirements.
 */
export const validateTypeSpecificRequirements = (
  feature: ExtractedFeature
): { valid: boolean; issues: string[] } => {
  const issues: string[] = [];

  switch (feature.type) {
    case 'infrastructure': {
      // Cloud deployments should have provider in properties
      if (feature.subtype === 'cloud_deployment' && !feature.properties.provider) {
        issues.push(
          `Infrastructure feature "${feature.id}" (cloud_deployment) should have provider in properties`
        );
      }
      // Operating systems should have os in properties
      if (feature.subtype === 'operating_system' && !feature.properties.os) {
        issues.push(
          `Infrastructure feature "${feature.id}" (operating_system) should have os in properties`
        );
      }
      break;
    }

    case 'technology': {
      // Programming languages should have language in properties
      if (feature.subtype === 'programming_language' && !feature.properties.language) {
        issues.push(
          `Technology feature "${feature.id}" (programming_language) should have language in properties`
        );
      }
      // Databases should have database in properties
      if (feature.subtype === 'database' && !feature.properties.database) {
        issues.push(
          `Technology feature "${feature.id}" (database) should have database in properties`
        );
      }
      // Web servers should have server in properties
      if (feature.subtype === 'web_server' && !feature.properties.server) {
        issues.push(
          `Technology feature "${feature.id}" (web_server) should have server in properties`
        );
      }
      break;
    }

    case 'dependency': {
      // Dependencies should have source and target in properties
      if (!feature.properties.source) {
        issues.push(`Dependency feature "${feature.id}" should have source in properties`);
      }
      if (!feature.properties.target) {
        issues.push(`Dependency feature "${feature.id}" should have target in properties`);
      }
      break;
    }
  }

  // Version validation: should be numeric only (no labels)
  if (feature.properties.version !== undefined) {
    const version = String(feature.properties.version);
    // Version should be numeric with optional dots (e.g., "1.2.3", not "1.2.3-beta")
    if (!/^[\d.]+$/.test(version)) {
      // Check if there's a raw_version in meta
      if (!feature.meta?.raw_version) {
        issues.push(
          `Feature "${feature.id}" has version "${version}" with non-numeric characters - raw_version should be in meta`
        );
      }
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
};

/**
 * Calculate type-specific validation score.
 *
 * @param features - Array of extracted features
 * @returns Tuple of [type validation score (0-1), list of issues]
 */
export const calculateTypeValidationScore = (
  features: ExtractedFeature[]
): { score: number; issues: string[] } => {
  if (features.length === 0) {
    return { score: 1.0, issues: [] };
  }

  const allIssues: string[] = [];
  let validCount = 0;

  for (const feature of features) {
    const result = validateTypeSpecificRequirements(feature);
    if (result.valid) {
      validCount++;
    } else {
      allIssues.push(...result.issues);
    }
  }

  return {
    score: validCount / features.length,
    issues: allIssues,
  };
};

// =============================================================================
// OVERALL QUALITY CALCULATION
// =============================================================================

/**
 * Calculate overall feature quality by combining all metrics.
 *
 * Weights:
 * - Schema Compliance: 30%
 * - Evidence Grounding: 25%
 * - Confidence Calibration: 20%
 * - Deduplication: 15%
 * - Properties Usage: 10%
 *
 * @param features - Array of extracted features
 * @param sampleDocuments - Original log documents for evidence grounding
 * @returns Complete quality metrics
 */
export const calculateOverallQuality = (
  features: ExtractedFeature[],
  sampleDocuments: Array<Record<string, unknown>>
): FeatureQualityMetrics => {
  // Handle empty features case
  if (features.length === 0) {
    return {
      schemaComplianceRate: 1.0,
      evidenceGroundingRate: 1.0,
      confidenceCalibrationScore: 1.0,
      deduplicationScore: 1.0,
      propertiesUsageScore: 1.0,
      overallQuality: 1.0,
      issues: [],
    };
  }

  // Calculate individual metrics
  const schemaResult = calculateSchemaComplianceRate(features);
  const evidenceResult = calculateEvidenceGroundingRate(features, sampleDocuments);
  const confidenceResult = calculateConfidenceCalibrationScore(features);
  const deduplicationResult = calculateDeduplicationScore(features);
  const propertiesResult = calculatePropertiesUsageScore(features);
  const typeResult = calculateTypeValidationScore(features);

  // Combine all issues
  const allIssues = [
    ...schemaResult.issues,
    ...evidenceResult.issues,
    ...confidenceResult.issues,
    ...deduplicationResult.issues,
    ...propertiesResult.issues,
    ...typeResult.issues,
  ];

  // Calculate weighted overall quality
  // Include type validation in schema compliance weight
  const adjustedSchemaRate = (schemaResult.rate + typeResult.score) / 2;

  const overallQuality =
    adjustedSchemaRate * 0.3 +
    evidenceResult.rate * 0.25 +
    confidenceResult.score * 0.2 +
    deduplicationResult.score * 0.15 +
    propertiesResult.score * 0.1;

  return {
    schemaComplianceRate: schemaResult.rate,
    evidenceGroundingRate: evidenceResult.rate,
    confidenceCalibrationScore: confidenceResult.score,
    deduplicationScore: deduplicationResult.score,
    propertiesUsageScore: propertiesResult.score,
    overallQuality,
    issues: allIssues,
  };
};

/**
 * Format metrics as a human-readable summary.
 *
 * @param metrics - Quality metrics to format
 * @returns Formatted string summary
 */
export const formatMetricsSummary = (metrics: FeatureQualityMetrics): string => {
  const lines = [
    `Overall Quality: ${(metrics.overallQuality * 100).toFixed(1)}%`,
    `  Schema Compliance: ${(metrics.schemaComplianceRate * 100).toFixed(1)}%`,
    `  Evidence Grounding: ${(metrics.evidenceGroundingRate * 100).toFixed(1)}%`,
    `  Confidence Calibration: ${(metrics.confidenceCalibrationScore * 100).toFixed(1)}%`,
    `  Deduplication: ${(metrics.deduplicationScore * 100).toFixed(1)}%`,
    `  Properties Usage: ${(metrics.propertiesUsageScore * 100).toFixed(1)}%`,
  ];

  if (metrics.issues.length > 0) {
    lines.push('');
    lines.push(`Issues (${metrics.issues.length}):`);
    for (const issue of metrics.issues.slice(0, 10)) {
      lines.push(`  - ${issue}`);
    }
    if (metrics.issues.length > 10) {
      lines.push(`  ... and ${metrics.issues.length - 10} more`);
    }
  }

  return lines.join('\n');
};
