/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function rewriteIngestPipeline(
  pipeline: string,
  substitutions: Array<{
    source: string;
    target: string;
    templateFunction: string;
  }>
): string {
  substitutions.forEach(sub => {
    const { source, target, templateFunction } = sub;
    // This reimplements the golang text/template expression {{TemplateFunction 'some-param'}}
    const match = `{{\\s?${templateFunction}\\s+'${source}'\\s?}}`;
    const regex = new RegExp(match);
    pipeline = pipeline.replace(regex, target);
  });
  return pipeline;
}
