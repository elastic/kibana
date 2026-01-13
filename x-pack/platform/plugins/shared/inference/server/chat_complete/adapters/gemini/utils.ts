/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Checks if the specified model must provide thought signatures for
 */
export const mustUseThoughtSignature = (modelName: string | undefined): boolean => {
  // if we couldn't resolve the model name, we can't know if it must use thought signatures
  if (modelName === undefined) {
    return false;
  }
  return isGemini3(modelName);
};

// gemini-3-flash or gemini-3-pro
const isGemini3 = (modelName: string) => modelName.toLowerCase().includes('gemini-3-');
