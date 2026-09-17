/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function buildFeatureIdentificationUserMessage({
  streamName,
  sampleDocuments,
  previouslyIdentifiedFeatures,
  knownFeatureIds,
  excludedFeatures,
}: {
  streamName: string;
  sampleDocuments: string;
  previouslyIdentifiedFeatures?: string;
  knownFeatureIds?: string;
  excludedFeatures?: string;
}): string {
  const parts: string[] = [];
  parts.push(`\`stream_name\`: ${streamName}`);
  if (excludedFeatures) {
    parts.push(`\`excluded_features\`:\n${excludedFeatures}`);
  }
  if (previouslyIdentifiedFeatures) {
    parts.push(`\`previously_identified_features\`:\n${previouslyIdentifiedFeatures}`);
  }
  if (knownFeatureIds) {
    parts.push(`\`known_feature_ids\`:\n${knownFeatureIds}`);
  }
  parts.push(`\`sample_documents\`:\n${sampleDocuments}`);
  return parts.join('\n\n');
}
