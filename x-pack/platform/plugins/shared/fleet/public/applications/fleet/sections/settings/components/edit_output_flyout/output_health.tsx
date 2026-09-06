/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiToolTip } from '@elastic/eui';
import { KbnDangerCallout, KbnSuccessCallout } from '@kbn/ui-callout';

import { i18n } from '@kbn/i18n';
import { FormattedMessage, FormattedRelative } from '@kbn/i18n-react';
import React, { useEffect, useState } from 'react';
import { useQuery } from '@kbn/react-query';

import type { GetOutputHealthResponse } from '../../../../../../../common/types';

import { sendGetOutputHealth, useStartServices } from '../../../../hooks';
import type { Output } from '../../../../types';
import { isBeatsOutput, isOtlpOutput } from '../../../../../../../common/services/output_helpers';

interface Props {
  output: Output;
  showBadge?: boolean;
}
const REFRESH_INTERVAL_MS = 10000;

export const OutputHealth: React.FunctionComponent<Props> = ({ output, showBadge }) => {
  const { notifications } = useStartServices();
  const [outputHealth, setOutputHealth] = useState<GetOutputHealthResponse | null>();

  const { data: outputHealthResponse } = useQuery(
    ['outputHealth', output.id],
    () => sendGetOutputHealth(output.id),
    { refetchInterval: REFRESH_INTERVAL_MS }
  );
  useEffect(() => {
    if (outputHealthResponse?.error) {
      notifications.toasts.addError(outputHealthResponse?.error, {
        title: i18n.translate('xpack.fleet.output.errorFetchingOutputHealth', {
          defaultMessage: 'Error fetching output state',
        }),
      });
    }
    setOutputHealth(outputHealthResponse?.data);
  }, [outputHealthResponse, notifications.toasts]);

  const outputHost = isBeatsOutput(output)
    ? output.hosts?.join(',') ?? ''
    : isOtlpOutput(output)
    ? output.otlp_exporter?.endpoint ?? ''
    : '';

  const EditOutputStatus: { [status: string]: JSX.Element | null } = {
    DEGRADED: (
      <KbnDangerCallout
        title="Error"
        data-test-subj="outputHealthDegradedCallout"
        text={
          <>
            <p className="eui-textBreakWord">
              {i18n.translate('xpack.fleet.output.calloutText', {
                defaultMessage: 'Unable to connect to "{name}" at {host}.',
                values: {
                  name: output.name,
                  host: outputHost,
                },
              })}
            </p>
            <p>
              {i18n.translate('xpack.fleet.output.calloutPromptText', {
                defaultMessage: 'Please check the details are correct.',
              })}
            </p>
          </>
        }
      />
    ),
    HEALTHY: (
      <KbnSuccessCallout
        title="Healthy"
        data-test-subj="outputHealthHealthyCallout"
        text={i18n.translate('xpack.fleet.output.successCalloutText', {
          defaultMessage: 'Connection with remote output established.',
        })}
      />
    ),
  };

  const OutputStatusBadge: { [status: string]: JSX.Element | null } = {
    DEGRADED: (
      <EuiBadge color="danger" data-test-subj="outputHealthDegradedBadge">
        <FormattedMessage
          id="xpack.fleet.outputHealth.degradedStatusText"
          defaultMessage="Unhealthy"
        />
      </EuiBadge>
    ),
    HEALTHY: (
      <EuiBadge color="success" data-test-subj="outputHealthHealthyBadge">
        <FormattedMessage
          id="xpack.fleet.outputHealth.healthyStatusText"
          defaultMessage="Healthy"
        />
      </EuiBadge>
    ),
  };

  const msLastTimestamp = new Date(outputHealth?.timestamp || 0).getTime();
  const lastTimestampText = msLastTimestamp ? (
    <>
      <FormattedMessage
        id="xpack.fleet.outputHealth.timestampTooltipText"
        defaultMessage="Last reported {timestamp}"
        values={{
          timestamp: <FormattedRelative value={msLastTimestamp} />,
        }}
      />
    </>
  ) : null;

  const outputBadge = (outputHealth?.state && OutputStatusBadge[outputHealth?.state]) || null;

  return showBadge ? (
    lastTimestampText && outputHealth?.state ? (
      <EuiToolTip
        position="top"
        content={lastTimestampText}
        data-test-subj="outputHealthBadgeTooltip"
      >
        <>{outputBadge} </>
      </EuiToolTip>
    ) : (
      outputBadge
    )
  ) : (
    (outputHealth?.state && EditOutputStatus[outputHealth.state]) || null
  );
};
