/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FileAnalysis, FileWrapper } from './file_wrapper';

export enum CLASH_TYPE {
  MAPPING,
  FORMAT,
  UNSUPPORTED,
}

export interface MappingClash {
  fieldName: string;
  existingType: string;
  clashingType: { fileName: string; newType: string; fileIndex: number };
}

export interface FileClash {
  fileName: string;
  clash: boolean;
  clashType?: CLASH_TYPE;
}

export function createMergedMappings(files: FileWrapper[]) {
  const mappings = files.map((file) => file.getMappings() ?? { properties: {} });

  // stringify each mappings and see if they are the same, if so return the first one.
  // otherwise drill down and extract each field with it's type.
  const mappingsString = mappings.map((m) => JSON.stringify(m));
  if (mappingsString.every((m) => m === mappingsString[0])) {
    return { mergedMappings: mappings[0], mappingClashes: [] };
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

  const mappingClashes: MappingClash[] = [];

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
            mappingClashes.push({
              fieldName: field.name,
              existingType: existingField.type,
              clashingType: {
                fileName: files[i].getFileName(),
                newType: field.value.type,
                fileIndex: i,
              },
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

  return { mergedMappings, mappingClashes };
}

export function getMappingClashInfo(
  mappingClashes: MappingClash[],
  filesStatus: FileAnalysis[]
): FileClash[] {
  const clashCounts = filesStatus
    .reduce<Array<{ index: number; count: number }>>((acc, file, i) => {
      const ff = { index: i, count: 0 };
      mappingClashes.forEach((clash) => {
        if (clash.clashingType.fileIndex === i) {
          ff.count++;
        }
      });
      acc.push(ff);
      return acc;
    }, [])
    .sort((a, b) => b.count - a.count);

  const middleIndex = Math.floor(clashCounts.length / 2);

  const median = clashCounts[middleIndex].count;

  const medianAboveZero = median > 0;
  const zeroCount = clashCounts.filter((c) => c.count === 0).length;
  const aboveZeroCount = clashCounts.length - zeroCount;
  const allClash = zeroCount === aboveZeroCount;

  clashCounts.sort((a, b) => a.index - b.index);

  return clashCounts.map((c) => {
    return {
      fileName: filesStatus[c.index].fileName,
      clash:
        allClash ||
        (medianAboveZero === false && c.count > 0) ||
        (medianAboveZero && c.count === 0),
      clashType: CLASH_TYPE.MAPPING,
    };
  });
}

export function getFormatClashes(files: FileWrapper[]): FileClash[] {
  const formatMap = files
    .map((file) => file.getFormat())
    .reduce((acc, format, i) => {
      if (format === undefined) {
        acc.set('unknown', (acc.get('unknown') ?? 0) + 1);
      } else {
        acc.set(format, (acc.get(format) ?? 0) + 1);
      }
      return acc;
    }, new Map<string, number>());

  // return early if there is only one format and it is supported
  if (formatMap.size === 1 && formatMap.has('unknown') === false) {
    return files.map((f) => ({
      fileName: f.getFileName(),
      clash: false,
    }));
  }

  const formatArray = Array.from(formatMap.entries()).sort((a, b) => b[1] - a[1]);

  const fileClashes = files.map((f) => {
    return {
      fileName: f.getFileName(),
      clash: f.getStatus().supportedFormat === false,
      clashType: CLASH_TYPE.UNSUPPORTED,
    };
  });

  const topCount = formatArray[0];

  // if the top count is for an unsupported format,
  // return the fileClashes containing unsupported formats
  if (topCount[0] === 'unknown') {
    return fileClashes;
  }

  // Check if all counts are the same,
  // mark all files as clashing
  const counts = Array.from(formatMap.values());
  const allCountsSame = counts.every((count) => count === counts[0]);
  if (allCountsSame) {
    return files.map((f) => {
      return {
        fileName: f.getFileName(),
        clash: true,
        clashType: f.getStatus().supportedFormat ? CLASH_TYPE.FORMAT : CLASH_TYPE.UNSUPPORTED,
      };
    });
  }

  return files.map((f) => {
    let clashType: CLASH_TYPE | undefined;
    if (f.getStatus().supportedFormat === false) {
      clashType = CLASH_TYPE.UNSUPPORTED;
    } else if (f.getFormat() !== topCount[0]) {
      clashType = CLASH_TYPE.FORMAT;
    }

    return {
      fileName: f.getFileName(),
      clash: clashType !== undefined,
      clashType,
    };
  });
}
