/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import type { MappingProperty, MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import { i18n } from '@kbn/i18n';
import { cloneDeep } from 'lodash';
import type { FileUploadManager } from '../../../../file_upload_manager/file_manager';

interface MappingEdits {
  name: string;
  originalName: string;
  mappingProperty: MappingProperty;
  originalMappingProperty: MappingProperty;
}

interface MappingError {
  message: string;
  errors: Array<{
    nameError: boolean;
    typeError: boolean;
    duplicateError: boolean;
  }>;
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
  // private mappingsSubscription: Subscription;
  private _mappings$ = new BehaviorSubject<Array<MappingEdits>>([]);
  public mappings$ = this._mappings$.asObservable();

  private _mappingsError$ = new BehaviorSubject<MappingError | null>(null);
  public mappingsError$ = this._mappingsError$.asObservable();

  private originalMappingJSON: MappingTypeMapping;

  private _mappingsEdited$ = new BehaviorSubject<boolean>(false);
  public mappingsEdited$ = this._mappingsEdited$.asObservable();

  constructor(private readonly fileUploadManager: FileUploadManager) {
    const originalMappings = this.fileUploadManager.getMappings().json;
    this.originalMappingJSON = cloneDeep(originalMappings);
    this.initializeMappings(originalMappings);
  }

  private initializeMappings(mappings: MappingTypeMapping) {
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

  public applyChanges() {
    const mappings = this._mappings$.getValue();
    const changes = mappings
      .filter((mapping) => mapping.name !== mapping.originalName)
      .map((mapping) => ({
        oldName: mapping.originalName,
        newName: mapping.name,
      }));

    if (changes.length > 0) {
      const mappingTypeMapping: MappingTypeMapping = {
        properties: mappings.reduce<Record<string, MappingProperty>>((acc, mapping) => {
          acc[mapping.name] = mapping.mappingProperty;
          return acc;
        }, {}),
      };

      this.fileUploadManager.updateMappings(mappingTypeMapping);
      this.fileUploadManager.removeConvertProcessors();
      this.fileUploadManager.renamePipelineTargetFields(changes);
    }
  }

  getMappings() {
    return this._mappings$.getValue();
  }
  getMappingsError() {
    return this._mappingsError$.getValue();
  }
  getMappingsEdited() {
    return this._mappingsEdited$.getValue();
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
      this._mappingsEdited$.next(true);
    }
  }

  private checkMappingsValid(mappingsArray: Array<MappingEdits>) {
    const errors: MappingError['errors'] = [];
    const tempMappingsArray = mappingsArray.map((mapping) => ({
      ...mapping,
      name: mapping.name.trim(),
    }));

    let hasBlankError = false;
    let hasDuplicateError = false;

    // Check for blank names and null types
    tempMappingsArray.forEach((mapping, index) => {
      const nameError = !mapping.name || mapping.name === '';
      const typeError = mapping.mappingProperty.type === null;

      errors.push({ nameError, typeError, duplicateError: false });
      hasBlankError = hasBlankError || nameError || typeError;
    });

    if (hasBlankError) {
      this._mappingsError$.next({
        message: blankMappingErrorText,
        errors,
      });
      return;
    }

    errors.length = 0;

    const nameCounts: Record<string, number> = {};
    tempMappingsArray.forEach((mapping) => {
      const name = mapping.name;
      nameCounts[name] = (nameCounts[name] ?? 0) + 1;
    });

    // Check for duplicate names
    tempMappingsArray.forEach((mapping, index) => {
      const name = mapping.name;
      const duplicateError = nameCounts[name] > 1;
      errors.push({
        nameError: false,
        typeError: false,
        duplicateError,
      });
      hasDuplicateError = hasDuplicateError || duplicateError;
    });

    if (hasDuplicateError) {
      this._mappingsError$.next({
        message: duplicateMappingErrorText,
        errors,
      });
      return;
    }

    // No errors
    this._mappingsError$.next(null);
  }

  public reset() {
    const mappings = this.originalMappingJSON;
    this.initializeMappings(mappings);
    this._mappingsEdited$.next(false);
  }
}
