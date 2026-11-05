/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, type ReactNode } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIconTip,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, FormattedRelative } from '@kbn/i18n-react';
import moment from 'moment';
import useInterval from 'react-use/lib/useInterval';
import type { CellDefinition } from '../../common/types';
import { getCellOutputs } from '../model/references';
import type { CellRuntime } from '../model/types';
import { CellOutputName } from './cell_output_name';
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
  cell,
  runtime,
  resizeHandle,
}: {
  cell: CellDefinition;
  runtime?: CellRuntime;
  resizeHandle?: ReactNode;
}) => {
  const { euiTheme } = useEuiTheme();
  const outputs = getCellOutputs(cell);
  const lastRunAt = runtime?.lastRunAt;
  const showStatus = runtime !== undefined && runtime.status !== 'done';
  const isEmpty = outputs.length === 0 && lastRunAt === undefined && !showStatus;

  // The resize button takes no height and draws its line through its centre, so the padding
  // places that line where the divider would be, or over the panel's bottom border when empty.
  const handleSlot = resizeHandle && (
    <div
      css={css`
        display: flex;
        flex-direction: column;
        padding-top: ${euiTheme.size.s};
        ${isEmpty
          ? `margin-bottom: calc(${euiTheme.size.s} * -1);`
          : `padding-bottom: ${euiTheme.size.s};`}
      `}
    >
      {resizeHandle}
    </div>
  );

  if (isEmpty) return handleSlot || null;

  return (
    <>
      {handleSlot || <EuiHorizontalRule margin="s" />}
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
                <EuiFlexItem grow={false} key={output.key}>
                  <CellOutputName cell={cell} output={output} />
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
