/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { capitalize, last } from 'lodash';
import React, { useMemo } from 'react';
import {
  IlmPolicyDeletePhase,
  IlmPolicyPhase,
  IlmPolicyPhases,
  IngestStreamLifecycleILM,
  PhaseName,
  Streams,
} from '@kbn/streams-schema';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTextColor,
  formatNumber,
  useEuiTheme,
} from '@elastic/eui';
import { useStreamsAppFetch } from '../../../hooks/use_streams_app_fetch';
import { useKibana } from '../../../hooks/use_kibana';
import { orderIlmPhases, parseDurationInSeconds } from './helpers';
import { IlmLink } from './ilm_link';
import { useIlmPhasesColorAndDescription } from './hooks/use_ilm_phases_color_and_description';
import { DataStreamStats } from './hooks/use_data_stream_stats';

export function IlmSummary({
  definition,
  lifecycle,
  stats,
}: {
  definition: Streams.ingest.all.GetResponse;
  lifecycle: IngestStreamLifecycleILM;
  stats?: DataStreamStats;
}) {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const { value, loading, error } = useStreamsAppFetch(
    ({ signal }) => {
      return streamsRepositoryClient.fetch('GET /internal/streams/{name}/lifecycle/_stats', {
        params: { path: { name: definition.stream.name } },
        signal,
      });
    },
    // we pass the stats as a hack to refresh the ilm summary
    // when the ingestion rate graph is refreshed
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [streamsRepositoryClient, definition, stats]
  );

  const phasesWithGrow = useMemo(() => {
    if (!value) return undefined;

    const orderedPhases = orderIlmPhases(value.phases);
    const totalDuration = parseDurationInSeconds(last(orderedPhases)!.min_age);

    return orderedPhases.map((phase, index, phases) => {
      const nextPhase = phases[index + 1];
      if (!nextPhase) {
        return { ...phase, grow: phase.name === 'delete' ? false : 2 };
      }

      const phaseDuration =
        parseDurationInSeconds(nextPhase!.min_age) - parseDurationInSeconds(phase!.min_age);
      return {
        ...phase,
        grow: Math.max(2, Math.round((phaseDuration / totalDuration) * 10)),
      };
    });
  }, [value]);

  return (
    <EuiFlexGroup direction="column" gutterSize="none">
      <EuiPanel hasShadow={false} hasBorder={false} paddingSize="s">
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem>
            <EuiFlexGroup alignItems="center" gutterSize="s">
              <EuiText>
                <h5>
                  {i18n.translate('xpack.streams.streamDetailLifecycle.policySummary', {
                    defaultMessage: 'Policy summary',
                  })}
                </h5>
              </EuiText>
              {loading ? <EuiLoadingSpinner size="s" /> : null}
            </EuiFlexGroup>
            <EuiTextColor color="subdued">
              {i18n.translate('xpack.streams.streamDetailLifecycle.policySummaryInfo', {
                defaultMessage: 'Phases and details of the lifecycle applied to this stream',
              })}
            </EuiTextColor>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <IlmLink lifecycle={lifecycle} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>

      <EuiPanel grow={true} hasShadow={false} hasBorder={false} paddingSize="s">
        {error || !phasesWithGrow ? null : (
          <EuiFlexGroup direction="row" gutterSize="none" responsive={false}>
            {phasesWithGrow.map((phase, index) => (
              <EuiFlexItem
                key={`${phase.name}-timeline`}
                grow={phase.grow as false | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10}
              >
                <IlmPhase phase={phase} minAge={phasesWithGrow[index + 1]?.min_age} />
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        )}
      </EuiPanel>

      <EuiSpacer size="m" />

      <PhasesLegend phases={value?.phases} />
    </EuiFlexGroup>
  );
}

function IlmPhase({
  phase,
  minAge,
}: {
  phase: IlmPolicyPhase | IlmPolicyDeletePhase;
  minAge?: string;
}) {
  const borderRadius =
    phase.name === 'delete'
      ? undefined
      : phase.name === 'hot'
      ? minAge
        ? '0px 16px 16px 0px'
        : '0px'
      : minAge
      ? '16px'
      : '16px 0px 0px 16px';
  const { ilmPhases } = useIlmPhasesColorAndDescription();
  const { euiTheme } = useEuiTheme();

  return (
    <>
      <EuiFlexGroup
        direction="column"
        gutterSize="xs"
        css={phase.name !== 'delete' ? { borderRight: '1px dashed black' } : undefined}
      >
        <EuiPanel
          paddingSize="s"
          hasBorder={false}
          hasShadow={false}
          css={{
            backgroundColor: ilmPhases[phase.name].color,
            margin: '0 2px',
            borderRadius,
          }}
          grow={false}
        >
          {phase.name === 'delete' ? (
            <EuiText size="xs" css={{ margin: '0 2px' }}>
              <EuiIcon size="s" type="trash" />
            </EuiText>
          ) : (
            <EuiText size="xs" color={euiTheme.colors.plainDark}>
              <b>{capitalize(phase.name)}</b>
            </EuiText>
          )}
        </EuiPanel>
        {'size_in_bytes' in phase ? (
          <EuiPanel
            paddingSize="s"
            borderRadius="none"
            hasBorder={false}
            hasShadow={false}
            grow={false}
            css={{ marginBottom: '40px' }}
          >
            <EuiText size="xs">
              <p>
                <b>Size</b> {formatNumber(phase.size_in_bytes, '0.0 ib')}
              </p>
            </EuiText>
          </EuiPanel>
        ) : null}
      </EuiFlexGroup>

      <EuiFlexGroup justifyContent="flexEnd">
        {phase.name !== 'delete' ? (
          <EuiPanel
            paddingSize="xs"
            css={{
              marginRight: minAge ? '-20px' : '-5px',
              width: '50px',
              backgroundColor: ilmPhases.delete.color,
            }}
            grow={false}
            hasBorder={false}
            hasShadow={false}
          >
            <EuiText textAlign="center" size="xs">
              {minAge ? minAge + (phase.name === 'hot' ? '*' : '') : '∞'}
            </EuiText>
          </EuiPanel>
        ) : undefined}
      </EuiFlexGroup>
    </>
  );
}

function PhasesLegend({ phases }: { phases?: IlmPolicyPhases }) {
  const { ilmPhases } = useIlmPhasesColorAndDescription();
  const descriptions = useMemo(() => {
    if (!phases) return [];

    const desc = orderIlmPhases(phases)
      .filter(({ name }) => name !== 'delete')
      .map((phase) => ({
        name: phase.name,
        description: ilmPhases[phase.name].description(phase, phases),
        color: ilmPhases[phase.name].color,
      })) as Array<
      {
        name: PhaseName | 'indefinite';
        description: string[];
      } & ({ color: string } | { icon: string })
    >;

    if (phases.delete) {
      desc.push({
        name: 'delete',
        description: ilmPhases.delete.description(phases.delete),
        icon: 'trash',
      });
    } else {
      desc.push({
        name: 'indefinite',
        description: [
          i18n.translate('xpack.streams.streamDetailLifecycle.noRetentionDescription', {
            defaultMessage: 'Data is stored indefinitely.',
          }),
        ],
        icon: 'infinity',
      });
    }

    return desc;
  }, [phases, ilmPhases]);

  if (!phases) return null;

  return (
    <EuiPanel hasBorder={false} hasShadow={false} paddingSize="s">
      {descriptions.map((phase, index) => (
        <React.Fragment key={phase.name}>
          <EuiFlexGroup alignItems="center">
            <EuiFlexItem grow={false} css={{ width: '20px', alignItems: 'center' }}>
              {'color' in phase ? (
                <span
                  style={{
                    height: '12px',
                    width: '12px',
                    borderRadius: '50%',
                    backgroundColor: phase.color,
                    display: 'inline-block',
                  }}
                />
              ) : (
                <EuiIcon type={phase.icon} />
              )}
            </EuiFlexItem>

            <EuiFlexItem grow={2}>
              <b>{capitalize(phase.name)}</b>
            </EuiFlexItem>

            <EuiFlexItem grow={10}>
              {phase.description.map((desc, idx) => (
                <EuiTextColor key={`${phase.name}-desc-${idx}`} color="subdued">
                  {desc}
                </EuiTextColor>
              ))}
            </EuiFlexItem>
          </EuiFlexGroup>

          {index === descriptions.length - 1 ? null : <EuiSpacer size="s" />}
        </React.Fragment>
      ))}
    </EuiPanel>
  );
}
