/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FileWrapper } from './file_wrapper';

export function createMergedMappings(files: FileWrapper[]) {
  const mappings = files.map((file) => file.getMappings() ?? { properties: {} });

  // stringify each mappings and see if they are the same, if so return the first one.
  // otherwise drill down and extract each field with it's type.
  const mappingsString = mappings.map((m) => JSON.stringify(m));
  if (mappingsString.every((m) => m === mappingsString[0])) {
    // eslint-disable-next-line no-console
    console.log('mappings strings are the same');

    return { mergedMappings: mappings[0], fieldClashes: [] };
  }

  const fieldsPerFile = mappings.map((m) => {
    if (m.properties === undefined) {
      return [];
    }
    return Object.entries(m.properties)
      .map(([key, value]) => {
        return { name: key, value };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  });

  const fieldClashes: any[] = [];

  const mergedMappingsMap = fieldsPerFile.reduce((acc, fields, i) => {
    fields.forEach((field) => {
      if (!acc.has(field.name)) {
        acc.set(field.name, field.value);
      } else {
        const existingField = acc.get(field.name);

        if (existingField.type !== field.value.type) {
          // if either new or existing field is text or keyword, we should allow the clash
          // and replace the existing field with the new field if the existing is keyword =
          if (existingField.type === 'keyword' && field.value.type === 'text') {
            // the existing field is keyword and the new field is text, replace the existing field with the text version
            acc.set(field.name, field.value);
          } else if (existingField.type === 'text' && field.value.type === 'keyword') {
            // do nothing
          } else {
            fieldClashes.push({
              fieldName: field.name,
              fieldTypes: [existingField.type, field.value.type],
            });
          }
        }
      }
    });
    return acc;
  }, new Map<string, any>());

  const mergedMappings = {
    properties: Object.fromEntries(mergedMappingsMap),
  };

  // eslint-disable-next-line no-console
  console.log('mergedMappings', mergedMappings);
  // eslint-disable-next-line no-console
  console.log('fieldClashes', fieldClashes);

  return { mergedMappings, fieldClashes };
}

export function createMergedPipeline(files: FileWrapper[], commonFileFormat: string) {
  // const pipelines = new Map<string, any>(
  //   files.map((file) => [file.getFileName(), file.getPipeline()])
  // );
  const pipelines = files.map((file) => file.getPipeline() ?? { processors: [], description: '' });
  const pipelineString = pipelines.map((p) => JSON.stringify(p));
  if (pipelineString.every((p) => p === pipelineString[0])) {
    // eslint-disable-next-line no-console
    console.log('pipeline strings are the same');

    return pipelines[0];
  }

  const stringifiedProcessorsPerFile = pipelines.map(({ processors }) =>
    processors.map((p) => ({ processorString: JSON.stringify(p), processor: p }))
  );

  // const processorsPerFile = pipelines.map(({ processors }) => processors);

  // const processorClashes: any[] = [];

  // const mergedProcessorsMap = processorsPerFile.reduce((acc, processors) => {
  //   processors.forEach((processor) => {

  //     if (!acc.has(processor.field)) {
  //       acc.set(processor.field, processor);
  //     } else {
  //       if (JSON.stringify(acc.get(processor.field)) !== JSON.stringify(processor)) {
  //         processorClashes.push({
  //           fieldName: processor.processor.field,
  //           processorTypes: [acc.get(processor.processor.field).type, processor.processor.type],
  //         });
  //       }
  //     }
  //   });
  //   return acc;
  // }, new Map<string, any>());

  // console.log('mergedProcessorsMap', mergedProcessorsMap);

  const mergedStringifiedProcessorMap = stringifiedProcessorsPerFile.reduce((acc, processors) => {
    processors.forEach((processor) => {
      if (!acc.has(processor.processorString)) {
        acc.set(processor.processorString, processor.processor);
      }
    });
    return acc;
  }, new Map<string, any>());

  // console.log('processorClashes', processorClashes);

  const mergedPipeline = {
    ...pipelines[0],
    processors: Array.from(mergedStringifiedProcessorMap.values()),
  };

  if (commonFileFormat === 'delimited') {
    const targetFields = new Set(
      ...mergedPipeline.processors
        .filter((p) => Object.keys(p)[0] === 'csv')
        .map((p) => p.csv.target_fields)
    );

    mergedPipeline.processors = mergedPipeline.processors.filter(
      (p) => Object.keys(p)[0] !== 'csv'
    );
    mergedPipeline.processors.splice(0, 0, {
      csv: {
        field: 'message',
        target_fields: Array.from(targetFields),
        ignore_missing: false,
      },
    });
  }

  // eslint-disable-next-line no-console
  console.log('mergedPipeline', mergedPipeline);

  return mergedPipeline ?? null;
}
