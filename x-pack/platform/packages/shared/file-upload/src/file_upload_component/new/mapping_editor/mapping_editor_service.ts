/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Subscription } from 'rxjs';
import { BehaviorSubject } from 'rxjs';
import type { MappingProperty, MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import { uniqBy } from 'lodash';
import { i18n } from '@kbn/i18n';
import type { FileUploadManager } from '../../../../file_upload_manager/file_manager';

interface MappingEdits {
  name: string;
  originalName: string;
  mappingProperty: MappingProperty;
  originalMappingProperty: MappingProperty;
}

const blankMappingErrorText = i18n.translate('xpack.fileUpload.mappingEditor.blankMappingError', {
  defaultMessage: 'Mapping name and type cannot be blank',
});
const duplicateMappingErrorText = i18n.translate(
  'xpack.fileUpload.mappingEditor.duplicateMappingError',
  {
    defaultMessage: 'Duplicate field names are not allowed',
  }
);

export class MappingEditorService {
  private mappingsSubscription: Subscription;
  private _mappings$ = new BehaviorSubject<Array<MappingEdits>>([]);
  public mappings$ = this._mappings$.asObservable();

  private _mappingsError$ = new BehaviorSubject<string | null>(null);
  public mappingsError$ = this._mappingsError$.asObservable();

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
      this.checkMappingsValid(mappingsArray);
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
  getMappingsError() {
    return this._mappingsError$.getValue();
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
      this.checkMappingsValid(mappings);
    }
  }

  private checkMappingsValid(mappingsArray: Array<MappingEdits>) {
    // Check for individual mapping validity
    const mappingPopulated = mappingsArray.every((mapping) => {
      // Name cannot be blank/empty
      if (!mapping.name || mapping.name.trim() === '') {
        return false;
      }

      // mappingProperty.type cannot be null, undefined, or empty
      if (
        !mapping.mappingProperty ||
        !mapping.mappingProperty.type ||
        mapping.mappingProperty.type.trim() === ''
      ) {
        return false;
      }

      return true;
    });

    if (!mappingPopulated) {
      this._mappingsError$.next(blankMappingErrorText);
      return;
    }

    // Check for duplicate names using lodash
    const uniqueMappings = uniqBy(mappingsArray, (mapping) => mapping.name.trim().toLowerCase());
    const noDuplicates = mappingsArray.length === uniqueMappings.length;
    if (!noDuplicates) {
      this._mappingsError$.next(duplicateMappingErrorText);
      return;
    }

    this._mappingsError$.next(null);
  }
}
