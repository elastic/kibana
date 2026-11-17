/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiAccordion,
  EuiComboBox,
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
import { KbnDangerCallout } from '@kbn/ui-callout';

import { validateSettingsAnswer } from '../../../../common/workflows/steps/settings';
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

/**
 * A log stream's starting point: off when the service already collects through a default-on
 * metrics stream, else its single default input, else no choice so the user is asked to pick one.
 */
const seedLogStream = (service: Service, stream: DataStream): StreamAnswer | undefined => {
  const hasDefaultOnToggle = service.data_streams.some(
    (other) => other !== stream && other.choice === 'toggle' && other.default_enabled === true
  );
  if (hasDefaultOnToggle) return { input: null };
  return stream.default_input ? { input: stream.default_input } : undefined;
};

/** Answer a user would send untouched: package defaults, as the approved card mockup shows them. */
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
            service.data_streams.flatMap((stream): Array<[string, StreamAnswer]> => {
              const seeded =
                stream.choice === 'one_of'
                  ? seedLogStream(service, stream)
                  : { input: stream.default_enabled ? stream.inputs[0]?.input ?? null : null };
              return seeded ? [[stream.id, seeded]] : [];
            })
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

/** Moves a stream to another input, dropping what only made sense for the previous one. */
const withInput = (
  previous: StreamAnswer,
  nextInput: string | null,
  stream: DataStream
): StreamAnswer => {
  if (nextInput === previous.input) return previous;
  const fieldNames = new Set(
    stream.inputs.find((candidate) => candidate.input === nextInput)?.fields.map(({ name }) => name)
  );
  const vars = Object.fromEntries(
    Object.entries(previous.vars ?? {}).filter(([name]) => fieldNames.has(name))
  );
  return {
    input: nextInput,
    ...(Object.keys(vars).length > 0 ? { vars } : {}),
  };
};

const normalizeTitle = (title: string) =>
  title
    .trim()
    .replace(/^collect\s+/i, '')
    .replace(/\s+from aws$/i, '')
    .replace(/\s+(logs|metrics)$/i, '')
    .toLowerCase();

/** The input's title is help only when it says something the stream title does not. */
const inputHelp = (stream: DataStream, input: Input): string | undefined => {
  const help = input.title || input.description;
  if (!help) return undefined;
  const [a, b] = [normalizeTitle(help), normalizeTitle(stream.title)];
  // Redundant when one title merely repeats the other, e.g. "... Findings" vs "... Findings logs".
  return a && b && (a.includes(b) || b.includes(a)) ? undefined : help;
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
    const selected = Array.isArray(value) ? value : [];
    return (
      <EuiComboBox
        fullWidth
        compressed
        noSuggestions
        aria-label={field.title}
        placeholder={i18n.translate('xpack.fleet.awsOnboardingSettings.multiPlaceholder', {
          defaultMessage: 'Type a value and press Enter',
        })}
        selectedOptions={selected.map((label) => ({ label }))}
        onCreateOption={(entry) => {
          const trimmed = entry.trim();
          if (trimmed && !selected.includes(trimmed)) onChange([...selected, trimmed]);
        }}
        onChange={(options) => onChange(options.map(({ label }) => label))}
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
      value={typeof value === 'string' || typeof value === 'number' ? String(value) : ''}
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
  const answered = draft.services[service.id]?.data_streams[stream.id];
  const streamAnswer = answered ?? { input: null };
  const pathPrefix = `${service.id}.${stream.id}`;
  const selected = stream.inputs.find((candidate) => candidate.input === streamAnswer.input);
  const inputProblems = [
    ...new Set(
      problems
        .filter((problem) => problem.path === `${pathPrefix}.input`)
        .map((problem) => problem.message)
    ),
  ];
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
            change((previous) =>
              withInput(previous, e.target.checked ? stream.inputs[0]?.input ?? null : null, stream)
            )
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
        <strong>
          {i18n.translate('xpack.fleet.awsOnboardingSettings.streamLabel', {
            defaultMessage: '{title} · {dataset}',
            values: { title: stream.title, dataset: stream.dataset },
          })}
        </strong>
      </EuiText>
      <EuiSpacer size="xs" />
      <EuiTitle size="xxs">
        <h5>
          {i18n.translate('xpack.fleet.awsOnboardingSettings.collectionMethod', {
            defaultMessage: 'Collection method',
          })}
        </h5>
      </EuiTitle>
      <EuiRadioGroup
        name={`${pathPrefix}-input`}
        // A stream with no answer yet has nothing checked, not "Don't collect".
        idSelected={answered ? radioId(stream.id, answered.input ?? OFF) : undefined}
        options={[
          ...stream.inputs.map((input) => ({
            id: radioId(stream.id, input.input),
            label: (
              <>
                <strong>{input.ingestion_method}</strong>
                {inputHelp(stream, input) && (
                  <EuiText size="xs" color="subdued">
                    {inputHelp(stream, input)}
                  </EuiText>
                )}
              </>
            ),
            'data-test-subj': `awsOnboardingSettings-${stream.id}-input-${input.input}`,
          })),
          {
            id: radioId(stream.id, OFF),
            label: i18n.translate('xpack.fleet.awsOnboardingSettings.dontCollect', {
              defaultMessage: "Don''t collect",
            }),
            'data-test-subj': `awsOnboardingSettings-${stream.id}-input-off`,
          },
        ]}
        onChange={(id) => {
          const value = id.slice(stream.id.length + 1);
          change((previous) => withInput(previous, value === OFF ? null : value, stream));
        }}
      />
      {inputProblems.map((message) => (
        <EuiFormErrorText
          key={message}
          data-test-subj={`awsOnboardingSettings-${stream.id}-input-problem`}
        >
          {message}
        </EuiFormErrorText>
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
}> = ({ requirement, draft, problems = [], onChange }) => {
  const live = validateSettingsAnswer(requirement, draft);
  // Service-level rules, such as "enable at least one data stream", have no field to sit under.
  const serviceProblems = (serviceId: string) => [
    ...new Set(
      [...live, ...problems]
        .filter((problem) => problem.path === serviceId)
        .map((problem) => problem.message)
    ),
  ];
  // A missing collection method shows at once; missing values wait for a save.
  const streamProblems = [...problems, ...live.filter(({ path }) => path.endsWith('.input'))];

  const topLevel = [
    ...new Set(
      [...live, ...problems]
        .filter((problem) => problem.path === 'services')
        .map((problem) => problem.message)
    ),
  ];

  return (
    <>
      {topLevel.length > 0 && (
        <>
          <KbnDangerCallout
            announceOnMount={false}
            data-test-subj="awsOnboardingSettingsTopLevelProblems"
            title={topLevel.join(' ')}
          />
          <EuiSpacer size="s" />
        </>
      )}
      {requirement.services.map((service) => (
        <div key={service.id} data-test-subj={`awsOnboardingSettings-service-${service.id}`}>
          <EuiTitle size="xxs">
            <h4>{service.name}</h4>
          </EuiTitle>
          {serviceProblems(service.id).map((message) => (
            <EuiFormErrorText
              key={message}
              data-test-subj={`awsOnboardingSettings-service-${service.id}-problem`}
            >
              {message}
            </EuiFormErrorText>
          ))}
          {service.data_streams.map((stream) => (
            <React.Fragment key={stream.id}>
              <EuiSpacer size="m" />
              <StreamEditor
                service={service}
                stream={stream}
                draft={draft}
                problems={streamProblems}
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
                {/* The notes are verbatim README lines: keep each bullet on its own line. */}
                <EuiText size="s" css={{ whiteSpace: 'pre-wrap' }}>
                  {service.readme_notes}
                </EuiText>
              </EuiAccordion>
            </>
          ) : null}
          <EuiSpacer size="l" />
        </div>
      ))}
    </>
  );
};
