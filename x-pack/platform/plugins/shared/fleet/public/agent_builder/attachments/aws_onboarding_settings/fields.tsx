/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiAccordion,
  EuiFieldPassword,
  EuiFieldText,
  EuiFormErrorText,
  EuiFormRow,
  EuiRadioGroup,
  EuiSelect,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import type {
  AwsOnboardingSettingsAnswer,
  AwsOnboardingSettingsRequirement,
  SettingsProblem,
} from '../../../../common/workflows/steps/settings';

type Service = AwsOnboardingSettingsRequirement['services'][number];
type DataStream = Service['data_streams'][number];
type Input = DataStream['inputs'][number];
type Field = Input['fields'][number];
type StreamAnswer = AwsOnboardingSettingsAnswer['services'][string]['data_streams'][string];
type VarValue = NonNullable<StreamAnswer['vars']>[string];

const OFF = '__off__';
// EuiRadioGroup renders the option id as the DOM id, so scope it to the stream.
const radioId = (streamId: string, id: string) => `${streamId}:${id}`;

/** Answer a user would send untouched: package defaults, with log streams off unless one is default. */
export const seedDraft = (
  requirement: AwsOnboardingSettingsRequirement,
  answer?: AwsOnboardingSettingsAnswer
): AwsOnboardingSettingsAnswer =>
  answer ?? {
    services: Object.fromEntries(
      requirement.services.map((service) => [
        service.id,
        {
          data_streams: Object.fromEntries(
            service.data_streams.map((stream): [string, StreamAnswer] => [
              stream.id,
              stream.choice === 'one_of'
                ? { input: stream.default_input ?? null }
                : { input: stream.default_enabled ? stream.inputs[0]?.input ?? null : null },
            ])
          ),
        },
      ])
    ),
  };

const updateStream = (
  draft: AwsOnboardingSettingsAnswer,
  serviceId: string,
  streamId: string,
  update: (previous: StreamAnswer) => StreamAnswer
): AwsOnboardingSettingsAnswer => {
  const service = draft.services[serviceId] ?? { data_streams: {} };
  const previous = service.data_streams[streamId] ?? { input: null };
  return {
    ...draft,
    services: {
      ...draft.services,
      [serviceId]: {
        ...service,
        data_streams: { ...service.data_streams, [streamId]: update(previous) },
      },
    },
  };
};

const isSecret = (field: Field) => field.type === 'password' || field.type === 'secret';

const fieldLabel = (field: Field) =>
  field.required
    ? field.title
    : i18n.translate('xpack.fleet.awsOnboardingSettings.optionalField', {
        defaultMessage: '{title} (optional)',
        values: { title: field.title },
      });

const FieldControl: React.FC<{
  field: Field;
  value: VarValue | undefined;
  testSubj: string;
  onChange: (value: VarValue) => void;
}> = ({ field, value, testSubj, onChange }) => {
  if (field.type === 'bool') {
    return (
      <EuiSwitch
        label={field.title}
        checked={value === true}
        onChange={(e) => onChange(e.target.checked)}
        data-test-subj={testSubj}
      />
    );
  }
  if (field.options?.length && !field.multi) {
    return (
      <EuiSelect
        fullWidth
        compressed
        aria-label={field.title}
        hasNoInitialSelection={value === undefined}
        options={field.options.map(({ value: optionValue, text }) => ({
          value: optionValue,
          text,
        }))}
        value={typeof value === 'string' ? value : ''}
        onChange={(e) => onChange(e.target.value)}
        data-test-subj={testSubj}
      />
    );
  }
  if (field.multi) {
    // One entry per line keeps multi-value fields editable without a combo box.
    return (
      <EuiFieldText
        fullWidth
        compressed
        value={Array.isArray(value) ? value.join(', ') : ''}
        placeholder={i18n.translate('xpack.fleet.awsOnboardingSettings.multiPlaceholder', {
          defaultMessage: 'Comma-separated values',
        })}
        onChange={(e) =>
          onChange(
            e.target.value
              .split(',')
              .map((entry) => entry.trim())
              .filter(Boolean)
          )
        }
        data-test-subj={testSubj}
      />
    );
  }
  if (isSecret(field)) {
    return (
      <EuiFieldPassword
        fullWidth
        compressed
        autoComplete="new-password"
        value={typeof value === 'string' ? value : ''}
        onChange={(e) => onChange(e.target.value)}
        data-test-subj={testSubj}
      />
    );
  }
  return (
    <EuiFieldText
      fullWidth
      compressed
      value={typeof value === 'string' ? value : ''}
      onChange={(e) => onChange(e.target.value)}
      data-test-subj={testSubj}
    />
  );
};

/**
 * The fields of the selected input, required ones first, with its var-group choices as nested
 * radios that reveal only the selected option's vars. The requirement already lists only the
 * fields worth asking for, so the card and the canvas render the same set.
 */
export const SettingsFields: React.FC<{
  stream: DataStream;
  input: Input;
  streamAnswer: StreamAnswer;
  problems: SettingsProblem[];
  pathPrefix: string;
  onChange: (update: (previous: StreamAnswer) => StreamAnswer) => void;
}> = ({ stream, input, streamAnswer, problems, pathPrefix, onChange }) => {
  const selections = streamAnswer.var_group_selections ?? {};
  const selectedOption = (group: Input['var_groups'][number]) =>
    group.options.find((option) => option.name === selections[group.name]) ?? group.options[0];

  const hiddenByGroup = new Set(
    input.var_groups.flatMap((group) => {
      const selected = selectedOption(group);
      return group.options
        .filter((option) => option !== selected)
        .flatMap((option) => option.vars)
        .filter((name) => !selected?.vars.includes(name));
    })
  );

  const visible = input.fields
    .filter((field) => !hiddenByGroup.has(field.name))
    .sort((a, b) => Number(b.required) - Number(a.required));

  return (
    <div style={{ marginLeft: 32 }}>
      {input.var_groups.map((group) => (
        <EuiFormRow key={group.name} label={group.title} fullWidth>
          <EuiRadioGroup
            compressed
            name={`${pathPrefix}-${group.name}`}
            idSelected={radioId(pathPrefix, `${group.name}:${selectedOption(group)?.name}`)}
            options={group.options.map((option) => ({
              id: radioId(pathPrefix, `${group.name}:${option.name}`),
              label: option.title,
            }))}
            onChange={(id) =>
              onChange((previous) => ({
                ...previous,
                var_group_selections: {
                  ...previous.var_group_selections,
                  [group.name]: id.slice(pathPrefix.length + group.name.length + 2),
                },
              }))
            }
          />
        </EuiFormRow>
      ))}
      {visible.map((field) => {
        const path = `${pathPrefix}.vars.${field.name}`;
        const fieldProblems = problems.filter((problem) => problem.path === path);
        const value = streamAnswer.vars?.[field.name] ?? (field.default as VarValue | undefined);
        return (
          <EuiFormRow
            key={field.name}
            fullWidth
            label={field.type === 'bool' ? undefined : fieldLabel(field)}
            helpText={field.description}
            isInvalid={fieldProblems.length > 0}
            error={fieldProblems.map((problem) => problem.message)}
          >
            <FieldControl
              field={field}
              value={value}
              testSubj={`awsOnboardingSettings-${stream.id}-field-${field.name}`}
              onChange={(next) =>
                onChange((previous) => ({
                  ...previous,
                  vars: { ...previous.vars, [field.name]: next },
                }))
              }
            />
          </EuiFormRow>
        );
      })}
    </div>
  );
};

const StreamEditor: React.FC<{
  service: Service;
  stream: DataStream;
  draft: AwsOnboardingSettingsAnswer;
  problems: SettingsProblem[];
  onChange: (draft: AwsOnboardingSettingsAnswer) => void;
}> = ({ service, stream, draft, problems, onChange }) => {
  const streamAnswer = draft.services[service.id]?.data_streams[stream.id] ?? { input: null };
  const pathPrefix = `${service.id}.${stream.id}`;
  const selected = stream.inputs.find((candidate) => candidate.input === streamAnswer.input);
  const inputProblems = problems.filter((problem) => problem.path === `${pathPrefix}.input`);
  const change = (update: (previous: StreamAnswer) => StreamAnswer) =>
    onChange(updateStream(draft, service.id, stream.id, update));

  const fields = selected ? (
    <SettingsFields
      stream={stream}
      input={selected}
      streamAnswer={streamAnswer}
      problems={problems}
      pathPrefix={pathPrefix}
      onChange={change}
    />
  ) : null;

  if (stream.choice === 'toggle') {
    return (
      <>
        <EuiSwitch
          label={stream.title}
          checked={streamAnswer.input !== null}
          onChange={(e) =>
            change((previous) => ({
              ...previous,
              input: e.target.checked ? stream.inputs[0]?.input ?? null : null,
            }))
          }
          data-test-subj={`awsOnboardingSettings-${stream.id}-toggle`}
        />
        {fields}
      </>
    );
  }

  return (
    <>
      <EuiText size="xs" color="subdued">
        <strong style={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {i18n.translate('xpack.fleet.awsOnboardingSettings.streamLabel', {
            defaultMessage: '{title} · data stream {dataset} — choose one collection method',
            values: { title: stream.title, dataset: stream.dataset },
          })}
        </strong>
      </EuiText>
      <EuiRadioGroup
        name={`${pathPrefix}-input`}
        idSelected={radioId(stream.id, streamAnswer.input ?? OFF)}
        options={[
          ...stream.inputs.map((input) => ({
            id: radioId(stream.id, input.input),
            label: (
              <>
                <strong>{`${input.ingestion_method} — ${input.title}`}</strong>
                <EuiText size="xs" color="subdued">
                  {input.description}
                </EuiText>
              </>
            ),
            'data-test-subj': `awsOnboardingSettings-${stream.id}-input-${input.input}`,
          })),
          {
            id: radioId(stream.id, OFF),
            label: i18n.translate('xpack.fleet.awsOnboardingSettings.dontCollect', {
              defaultMessage: "Don''t collect {title}",
              values: { title: stream.title },
            }),
            'data-test-subj': `awsOnboardingSettings-${stream.id}-input-off`,
          },
        ]}
        onChange={(id) => {
          const value = id.slice(stream.id.length + 1);
          change((previous) => ({ ...previous, input: value === OFF ? null : value }));
        }}
      />
      {inputProblems.map((problem) => (
        <EuiFormErrorText key={problem.message}>{problem.message}</EuiFormErrorText>
      ))}
      {fields}
    </>
  );
};

/** Every service of the requirement, as the card and the canvas form render them. */
export const SettingsSections: React.FC<{
  requirement: AwsOnboardingSettingsRequirement;
  draft: AwsOnboardingSettingsAnswer;
  problems?: SettingsProblem[];
  onChange: (draft: AwsOnboardingSettingsAnswer) => void;
}> = ({ requirement, draft, problems = [], onChange }) => (
  <>
    {requirement.services.map((service) => (
      <div key={service.id} data-test-subj={`awsOnboardingSettings-service-${service.id}`}>
        <EuiTitle size="xxs">
          <h4>{service.name}</h4>
        </EuiTitle>
        {service.data_streams.map((stream) => (
          <React.Fragment key={stream.id}>
            <EuiSpacer size="s" />
            <StreamEditor
              service={service}
              stream={stream}
              draft={draft}
              problems={problems}
              onChange={onChange}
            />
          </React.Fragment>
        ))}
        {service.readme_notes ? (
          <>
            <EuiSpacer size="s" />
            <EuiAccordion
              id={`awsOnboardingSettingsNotes-${service.id}`}
              buttonContent={i18n.translate('xpack.fleet.awsOnboardingSettings.notes', {
                defaultMessage: 'Integration notes',
              })}
              initialIsOpen
              paddingSize="s"
            >
              <EuiText size="s">{service.readme_notes}</EuiText>
            </EuiAccordion>
          </>
        ) : null}
        <EuiSpacer size="m" />
      </div>
    ))}
  </>
);
