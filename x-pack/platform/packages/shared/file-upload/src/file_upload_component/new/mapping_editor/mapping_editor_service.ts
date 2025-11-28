/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Subscription } from 'rxjs';
import { BehaviorSubject } from 'rxjs';
import type { MappingProperty, MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import type { FileUploadManager } from '../../../../file_upload_manager/file_manager';

export class MappingEditorService {
  private mappingsSubscription: Subscription;
  private mappings$ = new BehaviorSubject<
    Array<{
      name: string;
      originalName: string;
      mappingProperty: MappingProperty;
      originalMappingProperty: MappingProperty;
    }>
  >([]);

  constructor(private readonly fileUploadManager: FileUploadManager) {
    this.initializeMappings();

    this.mappingsSubscription = this.mappings$.subscribe((mappings) => {
      const mappingTypeMapping: MappingTypeMapping = {
        properties: mappings.reduce<Record<string, MappingProperty>>((acc, mapping) => {
          acc[mapping.name] = mapping.mappingProperty;
          return acc;
        }, {}),
      };

      this.fileUploadManager.updateMappings(mappingTypeMapping);
    });
  }

  private initializeMappings() {
    const mappings = this.fileUploadManager.getMappings().json;
    if (mappings.properties) {
      const mappingsArray = Object.entries(mappings.properties).map(([fieldName, fieldConfig]) => ({
        name: fieldName,
        originalName: fieldName,
        mappingProperty: fieldConfig as MappingProperty,
        originalMappingProperty: fieldConfig as MappingProperty,
      }));

      this.mappings$.next(mappingsArray);
    }
  }

  public destroy() {
    this.mappingsSubscription.unsubscribe();

    // Apply any pending field name changes
    const mappings = this.mappings$.getValue();
    const changes = mappings
      .filter((mapping) => mapping.name !== mapping.originalName)
      .map((mapping) => ({
        oldName: mapping.originalName,
        newName: mapping.name,
      }));

    if (changes.length > 0) {
      this.fileUploadManager.renamePipelineTargetFields(changes);
    }
  }

  getMappings() {
    return this.mappings$.getValue();
  }
  getMappings$() {
    return this.mappings$.asObservable();
  }

  // updateMappingName(index: number, newFieldName: string) {
  //   const mappings = [...this.mappings$.getValue()];
  //   if (mappings[index]) {
  //     const currentType = Object.values(mappings[index])[0];
  //     mappings[index] = { [newFieldName]: currentType };
  //     this.mappings$.next(mappings);
  //   }
  // }

  // updateMappingType(index: number, newType: string) {
  //   const mappings = [...this.mappings$.getValue()];
  //   if (mappings[index]) {
  //     const currentFieldName = Object.keys(mappings[index])[0];
  //     mappings[index] = { [currentFieldName]: { type: newType } as MappingProperty };
  //     this.mappings$.next(mappings);
  //   }
  // }

  updateMapping(index: number, fieldName: string, fieldType: string) {
    const mappings = [...this.mappings$.getValue()];
    if (mappings[index]) {
      mappings[index] = {
        ...mappings[index],
        name: fieldName,
        mappingProperty: { type: fieldType } as MappingProperty,
      };
      this.mappings$.next(mappings);
    }
  }
}
