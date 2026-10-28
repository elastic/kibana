/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Meta, StoryObj } from '@storybook/react';
import React, { useMemo, useState } from 'react';
import {
  EuiButton,
  EuiCodeBlock,
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiTextArea,
  EuiTitle,
} from '@elastic/eui';
import type { CatalogueSignal, ComponentCatalogue } from '@kbn/streams-schema';
import { KbnWarningCallout } from '@kbn/ui-callout';
import fixture from '../../services/component_catalogue/catalogue_snapshot/components_v1.json';
import { ComponentDefinitionForm } from './component_definition_form';
import { validateValues } from './client_validation';
import { createInitialObject, toConfigEntries } from './serialize';
import type { FieldErrors, ObjectValue } from './values';

const fixtureCatalogue = fixture as ComponentCatalogue;

function DefinitionPlayground({ catalogue }: { catalogue: ComponentCatalogue }) {
  const [selectedKey, setSelectedKey] = useState(() => {
    const first =
      catalogue.definitions.find(({ kind }) => kind === 'processor') ?? catalogue.definitions[0];
    return first ? `${first.kind}/${first.type}` : '';
  });
  const definition = catalogue.definitions.find(
    ({ kind, type }) => `${kind}/${type}` === selectedKey
  );
  const [telemetry, setTelemetry] = useState<CatalogueSignal[]>(['logs']);
  const [values, setValues] = useState<ObjectValue>(() =>
    definition
      ? createInitialObject(definition.fields, undefined, {
          metadata: catalogue.metadata,
          telemetry: ['logs'],
        })
      : {}
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const context = useMemo(
    () => ({ metadata: catalogue.metadata, telemetry }),
    [catalogue.metadata, telemetry]
  );

  const reset = (key: string, signals: CatalogueSignal[]) => {
    const next = catalogue.definitions.find(({ kind, type }) => `${kind}/${type}` === key);
    setSelectedKey(key);
    setErrors({});
    setValues(
      next
        ? createInitialObject(next.fields, undefined, {
            metadata: catalogue.metadata,
            telemetry: signals,
          })
        : {}
    );
  };

  if (!definition) {
    return <KbnWarningCallout announceOnMount title="The catalogue has no definitions" />;
  }

  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <EuiFlexGroup gutterSize="s">
          <EuiFlexItem>
            <EuiFormRow label="Component">
              <EuiSelect
                options={catalogue.definitions.map(({ kind, type, display_name: name }) => ({
                  value: `${kind}/${type}`,
                  text: `${kind}: ${name}`,
                }))}
                value={selectedKey}
                onChange={(event) => reset(event.target.value, telemetry)}
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFormRow label="Telemetry">
              <EuiComboBox
                options={definition.supported_telemetry.map((signal) => ({ label: signal }))}
                selectedOptions={telemetry.map((signal) => ({ label: signal }))}
                onChange={(next) => {
                  const signals = definition.supported_telemetry.filter((signal) =>
                    next.some(({ label }) => label === signal)
                  );
                  setTelemetry(signals);
                  reset(selectedKey, signals);
                }}
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer />
        <EuiPanel hasBorder>
          <ComponentDefinitionForm
            definition={definition}
            metadata={catalogue.metadata}
            telemetry={telemetry}
            values={values}
            errors={errors}
            onChange={setValues}
          />
        </EuiPanel>
        <EuiSpacer />
        <EuiButton onClick={() => setErrors(validateValues(definition.fields, values, context))}>
          Validate
        </EuiButton>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiTitle size="xxs">
          <h3>Config entries</h3>
        </EuiTitle>
        <EuiCodeBlock language="json" isCopyable>
          {JSON.stringify(toConfigEntries(definition.fields, values, [], telemetry), null, 2)}
        </EuiCodeBlock>
        <EuiSpacer />
        <EuiTitle size="xxs">
          <h3>Client validation errors</h3>
        </EuiTitle>
        <EuiCodeBlock language="json">{JSON.stringify(errors, null, 2)}</EuiCodeBlock>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

const meta: Meta<typeof ComponentDefinitionForm> = {
  component: ComponentDefinitionForm,
  title: 'streams/ComponentDefinitionForm',
};

export default meta;
type Story = StoryObj<typeof ComponentDefinitionForm>;

/** Every definition in the captured `GET /v1/components` response. */
export const CatalogueFixture: Story = {
  render: () => <DefinitionPlayground catalogue={fixtureCatalogue} />,
};

/** Paste any `GET /v1/components` response body to check how its definitions render. */
export const PasteCatalogue: Story = {
  render: () => {
    const Story = () => {
      const [text, setText] = useState(() => JSON.stringify(fixtureCatalogue, null, 2));
      const [catalogue, setCatalogue] = useState<ComponentCatalogue>(fixtureCatalogue);
      const [parseError, setParseError] = useState<string>();
      return (
        <>
          <EuiFormRow
            label="Catalogue JSON"
            fullWidth
            isInvalid={Boolean(parseError)}
            error={parseError}
          >
            <EuiTextArea
              isInvalid={Boolean(parseError)}
              fullWidth
              rows={8}
              value={text}
              onChange={(event) => setText(event.target.value)}
            />
          </EuiFormRow>
          <EuiButton
            onClick={() => {
              try {
                setCatalogue(JSON.parse(text) as ComponentCatalogue);
                setParseError(undefined);
              } catch (error) {
                setParseError(String(error));
              }
            }}
          >
            Load catalogue
          </EuiButton>
          <EuiSpacer />
          <DefinitionPlayground key={catalogue.component_revision} catalogue={catalogue} />
        </>
      );
    };
    return <Story />;
  },
};
