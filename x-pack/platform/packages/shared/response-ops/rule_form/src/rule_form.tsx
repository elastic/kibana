/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiFlyoutResizableProps } from '@elastic/eui';
import { EuiEmptyPrompt, EuiText } from '@elastic/eui';
import React, { useMemo } from 'react';
import { QueryClientProvider, QueryClient } from '@kbn/react-query';
import { type RuleCreationValidConsumer } from '@kbn/rule-data-utils';
import { CreateRuleForm } from './create_rule_form';
import { EditRuleForm } from './edit_rule_form';
import { RuleFormScreenContextProvider } from './rule_form_screen_context';
import {
  RULE_FORM_ROUTE_PARAMS_ERROR_TEXT,
  RULE_FORM_ROUTE_PARAMS_ERROR_TITLE,
} from './translations';
import type { RuleFormData, RuleFormPlugins, RuleTypeMetaData } from './types';
import type { RuleFormStepId } from './constants';

const queryClient = new QueryClient();

export interface RuleFormProps<MetaData extends RuleTypeMetaData = RuleTypeMetaData> {
  plugins: RuleFormPlugins;
  id?: string;
  ruleTypeId?: string;
  isFlyout?: boolean;
  onCancel?: () => void;
  onSubmit?: (ruleId: string) => void;
  onChangeMetaData?: (metadata: MetaData) => void;
  consumer?: string;
  connectorFeatureId?: string;
  multiConsumerSelection?: RuleCreationValidConsumer | null;
  hideInterval?: boolean;
  validConsumers?: RuleCreationValidConsumer[];
  filteredRuleTypes?: string[];
  shouldUseRuleProducer?: boolean;
  canShowConsumerSelection?: boolean;
  showMustacheAutocompleteSwitch?: boolean;
  initialValues?: Partial<Omit<RuleFormData, 'ruleTypeId'>>;
  initialMetadata?: MetaData;
  initialEditStep?: RuleFormStepId;
  focusTrapProps?: EuiFlyoutResizableProps['focusTrapProps'];
}

export const RuleForm = <MetaData extends RuleTypeMetaData = RuleTypeMetaData>(
  props: RuleFormProps<MetaData>
) => {
  const {
    plugins: _plugins,
    onCancel,
    onSubmit,
    onChangeMetaData,
    id,
    ruleTypeId,
    isFlyout,
    consumer,
    connectorFeatureId,
    multiConsumerSelection,
    hideInterval,
    validConsumers,
    filteredRuleTypes,
    shouldUseRuleProducer,
    canShowConsumerSelection,
    showMustacheAutocompleteSwitch,
    initialValues,
    initialMetadata,
    initialEditStep,
    focusTrapProps,
  } = props;

  const {
    http,
    i18n,
    theme,
    userProfile,
    application,
    notifications,
    charts,
    settings,
    data,
    dataViews,
    unifiedSearch,
    docLinks,
    ruleTypeRegistry,
    actionTypeRegistry,
    fieldsMetadata,
    contentManagement,
    uiActions,
  } = _plugins;

  const ruleFormComponent = useMemo(() => {
    const plugins = {
      http,
      i18n,
      theme,
      userProfile,
      application,
      notifications,
      charts,
      settings,
      data,
      dataViews,
      unifiedSearch,
      docLinks,
      ruleTypeRegistry,
      actionTypeRegistry,
      fieldsMetadata,
      contentManagement,
      uiActions,
    };

    // Passing the MetaData type all the way down the component hierarchy is unnecessary, this type is
    // only used for the benefit of consumers of the RuleForm component. Retype onChangeMetaData to ignore this type.
    const retypedOnChangeMetaData = onChangeMetaData as (metadata?: RuleTypeMetaData) => void;

    if (id) {
      return (
        <EditRuleForm
          id={id}
          plugins={plugins}
          onCancel={onCancel}
          onSubmit={onSubmit}
          onChangeMetaData={retypedOnChangeMetaData}
          isFlyout={isFlyout}
          showMustacheAutocompleteSwitch={showMustacheAutocompleteSwitch}
          connectorFeatureId={connectorFeatureId}
          initialMetadata={initialMetadata}
          initialEditStep={initialEditStep}
          focusTrapProps={focusTrapProps}
        />
      );
    }
    if (ruleTypeId) {
      return (
        <CreateRuleForm
          ruleTypeId={ruleTypeId}
          plugins={plugins}
          onCancel={onCancel}
          onSubmit={onSubmit}
          onChangeMetaData={retypedOnChangeMetaData}
          isFlyout={isFlyout}
          consumer={consumer}
          connectorFeatureId={connectorFeatureId}
          multiConsumerSelection={multiConsumerSelection}
          hideInterval={hideInterval}
          validConsumers={validConsumers}
          filteredRuleTypes={filteredRuleTypes}
          shouldUseRuleProducer={shouldUseRuleProducer}
          canShowConsumerSelection={canShowConsumerSelection}
          showMustacheAutocompleteSwitch={showMustacheAutocompleteSwitch}
          initialValues={initialValues}
          initialMetadata={initialMetadata}
          focusTrapProps={focusTrapProps}
        />
      );
    }
    return (
      <EuiEmptyPrompt
        color="danger"
        iconType="error"
        title={<h2>{RULE_FORM_ROUTE_PARAMS_ERROR_TITLE}</h2>}
        body={
          <EuiText>
            <p>{RULE_FORM_ROUTE_PARAMS_ERROR_TEXT}</p>
          </EuiText>
        }
      />
    );
  }, [
    http,
    i18n,
    theme,
    userProfile,
    application,
    notifications,
    charts,
    settings,
    data,
    dataViews,
    unifiedSearch,
    docLinks,
    ruleTypeRegistry,
    actionTypeRegistry,
    fieldsMetadata,
    contentManagement,
    uiActions,
    onChangeMetaData,
    id,
    ruleTypeId,
    onCancel,
    onSubmit,
    isFlyout,
    showMustacheAutocompleteSwitch,
    connectorFeatureId,
    initialMetadata,
    initialEditStep,
    focusTrapProps,
    consumer,
    multiConsumerSelection,
    hideInterval,
    validConsumers,
    filteredRuleTypes,
    shouldUseRuleProducer,
    canShowConsumerSelection,
    initialValues,
  ]);

  return (
    <QueryClientProvider client={queryClient}>
      <RuleFormScreenContextProvider>{ruleFormComponent}</RuleFormScreenContextProvider>
    </QueryClientProvider>
  );
};
