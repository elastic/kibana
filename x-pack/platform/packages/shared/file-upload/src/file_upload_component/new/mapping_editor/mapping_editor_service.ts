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
  private _mappings$ = new BehaviorSubject<
    Array<{
      name: string;
      originalName: string;
      mappingProperty: MappingProperty;
      originalMappingProperty: MappingProperty;
    }>
  >([]);

  public mappings$ = this._mappings$.asObservable();

  private _mappingsValid$ = new BehaviorSubject<boolean>(true);
  public mappingsValid$ = this._mappingsValid$.asObservable();

  constructor(private readonly fileUploadManager: FileUploadManager) {
    this.initializeMappings();

    this.mappingsSubscription = this._mappings$.subscribe((mappings) => {
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

      this._mappings$.next(mappingsArray);
      this.checkMappingsValid();
    }
  }

  public destroy() {
    this.mappingsSubscription.unsubscribe();

    // Apply any pending field name changes
    const mappings = this._mappings$.getValue();
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
    return this._mappings$.getValue();
  }
  getMappingsValid() {
    return this._mappingsValid$.getValue();
  }

  updateMapping(index: number, fieldName: string, fieldType: string | null) {
    const mappings = [...this._mappings$.getValue()];
    if (mappings[index]) {
      mappings[index] = {
        ...mappings[index],
        name: fieldName,
        mappingProperty: { type: fieldType } as MappingProperty,
      };
      this._mappings$.next(mappings);
      this.checkMappingsValid();
    }
  }

  private checkMappingsValid() {
    const currentMappings = this.fileUploadManager.getMappings().json;

    if (!currentMappings.properties) {
      this._mappingsValid$.next(false);
      return;
    }

    // Check if all mappings are valid
    const isValid = Object.entries(currentMappings.properties).every(
      ([fieldName, mappingConfig]) => {
        // Field name (key) cannot be blank/empty
        if (!fieldName || fieldName.trim() === '') {
          return false;
        }

        // Type cannot be null, undefined, or empty
        if (!mappingConfig?.type || mappingConfig.type.trim() === '') {
          return false;
        }

        return true;
      }
    );

    this._mappingsValid$.next(isValid);
  }
}
