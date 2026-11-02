/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIconTip,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, FormattedRelative } from '@kbn/i18n-react';
import moment from 'moment';
import useInterval from 'react-use/lib/useInterval';
import type { CellRuntime } from '../model/types';
import { CellStatusBadge } from './cell_status_badge';

const RELATIVE_TIME_REFRESH_MS = 30_000;
const JUST_NOW_MS = 60_000;

const OUTPUTS_LABEL = i18n.translate('xpack.notebook.cell.outputs', {
  defaultMessage: 'Outputs',
});

const LastRun = ({ lastRunAt, durationMs }: { lastRunAt: number; durationMs?: number }) => {
  const [, setTick] = useState(0);
  useInterval(() => setTick((tick) => tick + 1), RELATIVE_TIME_REFRESH_MS);

  const ranAt = moment(lastRunAt);
  const time = ranAt.format(ranAt.isSame(moment(), 'day') ? 'LT' : 'LLL');
  const tooltip =
    durationMs === undefined
      ? time
      : i18n.translate('xpack.notebook.cell.lastRunTooltip', {
          defaultMessage: '{time} · took {duration} ms',
          values: { time, duration: durationMs },
        });

  return (
    <EuiToolTip content={tooltip} position="left">
      <EuiText size="xs" color="subdued" tabIndex={0} data-test-subj="notebookCellLastRun">
        {Date.now() - lastRunAt < JUST_NOW_MS ? (
          <FormattedMessage id="xpack.notebook.cell.lastRunJustNow" defaultMessage="Ran just now" />
        ) : (
          <FormattedMessage
            id="xpack.notebook.cell.lastRun"
            defaultMessage="Ran {time}"
            values={{ time: <FormattedRelative value={lastRunAt} /> }}
          />
        )}
      </EuiText>
    </EuiToolTip>
  );
};

export const CellFooter = ({
  outputs = [],
  runtime,
}: {
  outputs?: readonly string[];
  runtime?: CellRuntime;
}) => {
  const lastRunAt = runtime?.lastRunAt;
  const showStatus = runtime !== undefined && runtime.status !== 'done';
  if (outputs.length === 0 && lastRunAt === undefined && !showStatus) return null;

  return (
    <>
      <EuiHorizontalRule margin="s" />
      <EuiFlexGroup
        gutterSize="s"
        alignItems="center"
        justifyContent="spaceBetween"
        responsive={false}
      >
        <EuiFlexItem grow={false}>
          {outputs.length > 0 && (
            <EuiFlexGroup
              gutterSize="xs"
              alignItems="center"
              wrap
              responsive={false}
              data-test-subj="notebookCellOutputs"
            >
              <EuiFlexItem grow={false}>
                <EuiIconTip
                  type="inputOutput"
                  content={OUTPUTS_LABEL}
                  aria-label={OUTPUTS_LABEL}
                  color="subdued"
                  size="s"
                  position="left"
                />
              </EuiFlexItem>
              {outputs.map((output) => (
                <EuiFlexItem grow={false} key={output}>
                  <EuiCode>{output}</EuiCode>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          )}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            {lastRunAt !== undefined && (
              <EuiFlexItem grow={false}>
                <LastRun lastRunAt={lastRunAt} durationMs={runtime?.durationMs} />
              </EuiFlexItem>
            )}
            {runtime && showStatus && (
              <EuiFlexItem grow={false}>
                <CellStatusBadge runtime={runtime} />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
