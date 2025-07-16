/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FindFileStructureResponse } from '@kbn/file-upload-plugin/common/types';
import type { MappingPropertyBase, MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import { isEqual } from 'lodash';
import type { FileAnalysis, FileWrapper } from './file_wrapper';

export enum CLASH_TYPE {
  MAPPING,
  FORMAT,
  UNSUPPORTED,
  EXISTING_INDEX_MAPPING,
  MANY_NEW_FIELDS,
  MANY_UNUSED_FIELDS,
}

export enum CLASH_ERROR_TYPE {
  NONE,
  ERROR,
  WARNING,
}

export interface MappingClash {
  fieldName: string;
  existingType: string;
  clashingType: { fileName: string; newType: string; fileIndex: number };
}

export interface FileClash {
  fileName: string;
  clash: CLASH_ERROR_TYPE;
  clashType?: CLASH_TYPE;
  newFields?: string[];
  missingFields?: string[];
  commonFields?: string[];
}

interface MergedMappings {
  mergedMappings: MappingTypeMapping;
  mappingClashes: MappingClash[];
  existingIndexChecks?: ExistingIndexChecks;
}

interface FieldsPerFile {
  fileName: string;
  fileIndex: number;
  fields: string[];
}

interface ExistingIndexChecks {
  existingFields: string[];
  newFieldsPerFile: FieldsPerFile[];
  mappingClashes: MappingClash[];
  unmappedFieldsPerFile: FieldsPerFile[];
  commonFieldsPerFile: FieldsPerFile[];
}

export function createMergedMappings(
  files: FileWrapper[],
  existingIndexMappings: FindFileStructureResponse['mappings'] | null
): MergedMappings {
  const checkExistingIndexMappings = existingIndexMappings !== null;

  const mappings = files.map((file) => file.getMappings() ?? { properties: {} });

  // compare the mappings of all files to see if they are all the same
  // if they are, return early
  if (mappings.every((m) => isEqual(m, mappings[0]))) {
    return { mergedMappings: mappings[0] as MappingTypeMapping, mappingClashes: [] };
  }

  const fieldsPerFile = mappings.map((m) => getFieldsFromMappings(m as MappingTypeMapping));

  if (existingIndexMappings !== null) {
    // add the existing index mappings to the beginning of the fields array
    // so the merged mappings contain the existing index mappings
    fieldsPerFile.splice(0, 0, getFieldsFromMappings(existingIndexMappings as MappingTypeMapping));
  }

  const mappingClashes: MappingClash[] = [];

  const mergedMappingsMap = fieldsPerFile.reduce((acc, fields, i) => {
    fields.forEach((field) => {
      if (!acc.has(field.name)) {
        acc.set(field.name, field.value);
      } else {
        const existingField = acc.get(field.name);

        if (existingField && existingField.type !== field.value.type) {
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
                newType: field.value.type as string,
                fileIndex: i,
              },
            });
          }
        }
      }
    });
    return acc;
  }, new Map<string, { type: string }>());

  if (existingIndexMappings !== null) {
    // remove the existing index mappings from the fields array
    // so the indices of fieldsPerFile match the files array
    fieldsPerFile.splice(0, 1);
  }

  const mergedMappings = {
    properties: Object.fromEntries(mergedMappingsMap),
  } as MappingTypeMapping;

  if (checkExistingIndexMappings === true) {
    const existingIndexChecks: ExistingIndexChecks = {
      existingFields: [],
      newFieldsPerFile: [],
      mappingClashes: [],
      unmappedFieldsPerFile: [],
      commonFieldsPerFile: [],
    };

    const existingFields = getFieldsFromMappings(existingIndexMappings as MappingTypeMapping);
    const existingFieldMap = existingFields.reduce((acc, field) => {
      acc.set(field.name, field.value);
      return acc;
    }, new Map<string, { type: string }>());

    existingIndexChecks.existingFields = existingFields.map((field) => field.name);

    for (const [i, fields] of fieldsPerFile.entries()) {
      const newFieldsPerFile: FieldsPerFile = {
        fileName: files[i].getFileName(),
        fileIndex: i,
        fields: [],
      };
      const commonFieldsPerFile: FieldsPerFile = {
        fileName: files[i].getFileName(),
        fileIndex: i,
        fields: [],
      };

      for (const field of fields) {
        const existingField = existingFieldMap.get(field.name);
        if (existingField !== undefined) {
          commonFieldsPerFile.fields.push(field.name);

          const existingType = existingField.type;
          if (existingType !== field.value.type) {
            if (existingType === 'text' && field.value.type === 'keyword') {
              // the existing field is text and the new field is keyword, we can keep the existing field type
            } else {
              existingIndexChecks.mappingClashes.push({
                fieldName: field.name,
                existingType,
                clashingType: {
                  fileName: files[i].getFileName(),
                  newType: field.value.type as string,
                  fileIndex: i,
                },
              });
            }
          }
        } else {
          newFieldsPerFile.fields.push(field.name);
        }
      }

      existingIndexChecks.newFieldsPerFile.push(newFieldsPerFile);
      existingIndexChecks.commonFieldsPerFile.push(commonFieldsPerFile);
      existingIndexChecks.unmappedFieldsPerFile.push({
        fileName: files[i].getFileName(),
        fileIndex: i,
        fields: existingIndexChecks.existingFields.filter(
          (field) => !commonFieldsPerFile.fields.includes(field)
        ),
      });
    }

    return { mergedMappings, mappingClashes, existingIndexChecks };
  }

  return { mergedMappings, mappingClashes };
}

export function getMappingClashInfo(
  mappingClashes: MappingClash[],
  existingIndexChecks: ExistingIndexChecks | undefined,
  filesStatus: FileAnalysis[]
): FileClash[] {
  const clashCounts: Array<{ index: number; count: number }> = filesStatus
    .map((file, i) => {
      const counts = { index: i, count: 0 };
      mappingClashes.forEach((clash) => {
        if (clash.clashingType.fileIndex === i) {
          counts.count++;
        }
      });
      return counts;
    })
    .sort((a, b) => b.count - a.count);

  const middleIndex = Math.floor(clashCounts.length / 2);

  const median = clashCounts[middleIndex].count;

  const medianAboveZero = median > 0;
  const zeroCount = clashCounts.filter((c) => c.count === 0).length;
  const aboveZeroCount = clashCounts.length - zeroCount;
  const allClash = zeroCount === aboveZeroCount;

  clashCounts.sort((a, b) => a.index - b.index);

  const existingIndexClashes = (existingIndexChecks?.mappingClashes ?? []).reduce((acc, clash) => {
    acc.set(clash.clashingType.fileIndex, true);
    return acc;
  }, new Map<number, boolean>());

  return clashCounts.map((c, i) => {
    const fileName = filesStatus[c.index].fileName;
    let fileClash: FileClash;
    if (existingIndexClashes.has(c.index)) {
      fileClash = {
        fileName,
        clash: CLASH_ERROR_TYPE.ERROR,
        clashType: CLASH_TYPE.EXISTING_INDEX_MAPPING,
      };
    } else {
      fileClash = {
        fileName,
        clash:
          allClash ||
          (medianAboveZero === false && c.count > 0) ||
          (medianAboveZero && c.count === 0)
            ? CLASH_ERROR_TYPE.ERROR
            : CLASH_ERROR_TYPE.NONE,
        clashType: CLASH_TYPE.MAPPING,
      };
    }
    if (existingIndexChecks?.newFieldsPerFile) {
      const newFields = existingIndexChecks.newFieldsPerFile[i];
      if (newFields) {
        fileClash.newFields = newFields.fields;
      }
    }
    if (existingIndexChecks?.unmappedFieldsPerFile) {
      const unmappedFieldsPerFile = existingIndexChecks.unmappedFieldsPerFile;
      fileClash.missingFields = unmappedFieldsPerFile[i].fields;
    }
    if (existingIndexChecks?.commonFieldsPerFile) {
      const commonFields = existingIndexChecks.commonFieldsPerFile[i];
      if (commonFields) {
        fileClash.commonFields = commonFields.fields;
      }
    }
    if (fileClash.clash !== CLASH_ERROR_TYPE.ERROR) {
      // if the file contains many new fields but none of them are in the existing index
      // set the clash to warning
      if (
        fileClash.missingFields &&
        existingIndexChecks?.existingFields &&
        existingIndexChecks?.existingFields.length > 0 &&
        fileClash.missingFields.length > (existingIndexChecks.existingFields.length - 1) / 2
      ) {
        fileClash.clash = CLASH_ERROR_TYPE.WARNING;
      }
    }
    return fileClash;
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
      clash: CLASH_ERROR_TYPE.NONE,
    }));
  }

  const formatArray = Array.from(formatMap.entries()).sort((a, b) => b[1] - a[1]);

  const fileClashes = files.map((f) => {
    return {
      fileName: f.getFileName(),
      clash:
        f.getStatus().supportedFormat === false ? CLASH_ERROR_TYPE.ERROR : CLASH_ERROR_TYPE.NONE,
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
        clash: CLASH_ERROR_TYPE.ERROR,
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
      clash: clashType !== undefined ? CLASH_ERROR_TYPE.ERROR : CLASH_ERROR_TYPE.NONE,
      clashType,
    };
  });
}

export function getFieldsFromMappings(mappings: MappingTypeMapping) {
  const fields: Array<{ name: string; value: { type: string } }> = [];

  function traverseProperties(properties: MappingPropertyBase, parentKey: string = '') {
    for (const [key, value] of Object.entries(properties)) {
      const fullKey = parentKey ? `${parentKey}.${key}` : key;

      if (value.properties) {
        traverseProperties(value.properties, fullKey);
      } else if (value.type) {
        fields.push({ name: fullKey, value });
      }
    }
  }

  if (mappings.properties) {
    traverseProperties(mappings.properties);
  }

  return fields.sort((a, b) => a.name.localeCompare(b.name));
}
