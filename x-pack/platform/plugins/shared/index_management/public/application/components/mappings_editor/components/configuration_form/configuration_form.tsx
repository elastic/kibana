/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState } from 'react';
import { EuiSpacer } from '@elastic/eui';

import { useAppContext } from '../../../../app_context';
import { loadSyntheticSourceStatus } from '../../../../services/api';
import { useForm, Form } from '../../shared_imports';
import type { GenericObject, MappingsConfiguration } from '../../types';
import { MapperSizePluginId } from '../../constants';
import { useDispatch } from '../../mappings_state_context';
import { DynamicMappingSection } from './dynamic_mapping_section';
import {
  SourceFieldSection,
  STORED_SOURCE_OPTION,
  SYNTHETIC_SOURCE_OPTION,
  DISABLED_SOURCE_OPTION,
} from './source_field_section';
import { MetaFieldSection } from './meta_field_section';
import { RoutingSection } from './routing_section';
import { MapperSizePluginSection } from './mapper_size_plugin_section';
import { SubobjectsSection } from './subobjects_section';
import { configurationFormSchema } from './configuration_form_schema';
import type { IndexMode } from '../../../../../../common/types/data_streams';
import { LOGSDB_INDEX_MODE, TIME_SERIES_MODE } from '../../../../../../common/constants';

interface Props {
  value?: MappingsConfiguration;
  /** List of plugins installed in the cluster nodes */
  esNodesPlugins: string[];
  indexMode?: IndexMode;
}

interface SerializedSourceField {
  enabled?: boolean;
  mode?: string;
  includes?: string[];
  excludes?: string[];
}

const serializeSourceField = (sourceField: any): SerializedSourceField | undefined => {
  if (sourceField?.option === SYNTHETIC_SOURCE_OPTION) {
    return { mode: SYNTHETIC_SOURCE_OPTION };
  }
  if (sourceField?.option === DISABLED_SOURCE_OPTION) {
    return { enabled: false };
  }
  if (sourceField?.option === STORED_SOURCE_OPTION) {
    return {
      mode: 'stored',
      includes: sourceField.includes,
      excludes: sourceField.excludes,
    };
  }
  if (sourceField?.includes || sourceField?.excludes) {
    // If sourceField?.option is undefined, the user hasn't explicitly selected
    // this option, so don't include the `mode` property
    return {
      includes: sourceField.includes,
      excludes: sourceField.excludes,
    };
  }
  return undefined;
};

export const formSerializer = (formData: GenericObject) => {
  const { dynamicMapping, sourceField, metaField, _routing, _size, subobjects } = formData;

  const dynamic = dynamicMapping?.enabled
    ? true
    : dynamicMapping?.throwErrorsForUnmappedFields
    ? 'strict'
    : dynamicMapping?.enabled;

  const serialized = {
    dynamic,
    numeric_detection: dynamicMapping?.numeric_detection,
    date_detection: dynamicMapping?.date_detection,
    dynamic_date_formats: dynamicMapping?.dynamic_date_formats,
    _source: serializeSourceField(sourceField),
    _meta: metaField,
    _routing,
    _size,
    subobjects,
  };

  return serialized;
};

export const formDeserializer = (formData: GenericObject) => {
  const {
    dynamic,
    numeric_detection,
    date_detection,
    dynamic_date_formats,
    _source: { enabled, mode, includes, excludes } = {} as SerializedSourceField,
    _meta,
    _routing,
    // For the Mapper Size plugin
    _size,
    subobjects,
  } = formData;

  return {
    dynamicMapping: {
      enabled: dynamic === 'strict' ? false : dynamic,
      throwErrorsForUnmappedFields: dynamic === 'strict' ? true : undefined,
      numeric_detection,
      date_detection,
      dynamic_date_formats,
    },
    sourceField: {
      option:
        mode === 'stored'
          ? STORED_SOURCE_OPTION
          : mode === 'synthetic'
          ? SYNTHETIC_SOURCE_OPTION
          : enabled === false
          ? DISABLED_SOURCE_OPTION
          : undefined,
      includes,
      excludes,
    },
    metaField: _meta,
    _routing,
    _size,
    subobjects,
  };
};

export const ConfigurationForm = React.memo(({ value, esNodesPlugins, indexMode }: Props) => {
  const {
    config: { enableMappingsSourceFieldSection },
    hasAtLeastEnterpriseLicense,
  } = useAppContext();

  const isMounted = useRef(false);
  const [syntheticSourceFallbackToStoredSource, setSyntheticSourceFallbackToStoredSource] =
    useState<boolean>();
  const canUseSyntheticSource =
    hasAtLeastEnterpriseLicense && syntheticSourceFallbackToStoredSource === false;

  const { form } = useForm({
    schema: configurationFormSchema,
    serializer: formSerializer,
    deserializer: formDeserializer,
    defaultValue: value,
    id: 'configurationForm',
    options: { stripUnsetFields: true },
  });
  const dispatch = useDispatch();
  const { subscribe, submit, reset, getFormData } = form;

  const isMapperSizeSectionVisible =
    value?._size !== undefined || esNodesPlugins.includes(MapperSizePluginId);

  useEffect(() => {
    let isSubscribed = true;

    if (!hasAtLeastEnterpriseLicense || !enableMappingsSourceFieldSection) {
      setSyntheticSourceFallbackToStoredSource(undefined);
      return () => {
        isSubscribed = false;
      };
    }

    loadSyntheticSourceStatus()
      .then(({ syntheticSourceFallbackToStoredSource: fallbackToStoredSource }) => {
        if (isSubscribed) {
          setSyntheticSourceFallbackToStoredSource(fallbackToStoredSource);
        }
      })
      .catch(() => {
        if (isSubscribed) {
          setSyntheticSourceFallbackToStoredSource(true);
        }
      });

    return () => {
      isSubscribed = false;
    };
  }, [enableMappingsSourceFieldSection, hasAtLeastEnterpriseLicense]);

  useEffect(() => {
    const subscription = subscribe(({ data, isValid, validate }) => {
      dispatch({
        type: 'configuration.update',
        value: {
          data,
          isValid,
          validate,
          submitForm: submit,
        },
      } as any);
    });

    return subscription.unsubscribe;
  }, [dispatch, subscribe, submit]);

  useEffect(() => {
    if (isMounted.current) {
      // If the value has changed (it probably means that we have loaded a new JSON)
      // we need to reset the form to update the fields values.
      reset({ resetValues: true, defaultValue: value });
    }
  }, [value, reset]);

  useEffect(() => {
    if (
      !value?._source &&
      canUseSyntheticSource &&
      enableMappingsSourceFieldSection &&
      (indexMode === LOGSDB_INDEX_MODE || indexMode === TIME_SERIES_MODE)
    ) {
      // If the source field is undefined (hasn't been set in the form)
      // and if the user has selected a `logsdb` or `time_series` index mode in the Logistics step,
      // update the form data with synthetic _source
      const nextValue = {
        ...(value ?? {}),
        _source: { mode: SYNTHETIC_SOURCE_OPTION },
      } as MappingsConfiguration;

      reset({ resetValues: true, defaultValue: nextValue });
      dispatch({ type: 'configuration.save', value: nextValue as any });
    }
  }, [canUseSyntheticSource, dispatch, enableMappingsSourceFieldSection, indexMode, reset, value]);

  useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;

      // Save a snapshot of the form state so we can get back to it when navigating back to the tab
      const configurationData = getFormData();
      dispatch({ type: 'configuration.save', value: configurationData as any });
    };
  }, [getFormData, dispatch]);

  return (
    <Form
      form={form}
      isInvalid={form.isSubmitted && !form.isValid && !form.isSubmitting}
      error={form.getErrors()}
      data-test-subj="advancedConfiguration"
    >
      <DynamicMappingSection />
      <EuiSpacer size="xl" />
      <MetaFieldSection />
      <EuiSpacer size="xl" />
      {enableMappingsSourceFieldSection && (
        <>
          <SourceFieldSection canUseSyntheticSource={canUseSyntheticSource} indexMode={indexMode} />{' '}
          <EuiSpacer size="xl" />
        </>
      )}
      <RoutingSection />
      {isMapperSizeSectionVisible && <MapperSizePluginSection />}
      <EuiSpacer size="xl" />
      <SubobjectsSection />
    </Form>
  );
});
