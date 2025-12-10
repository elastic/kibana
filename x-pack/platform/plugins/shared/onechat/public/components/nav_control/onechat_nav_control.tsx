/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiButton, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { css } from '@emotion/react';
import type { CoreStart } from '@kbn/core/public';
import type { OnechatPluginStart } from '../../types';
import { RobotIcon } from '../../application/components/common/icons/robot';
import { ONECHAT_FEATURE_ID, uiPrivileges } from '../../../common/features';

interface OnechatNavControlServices extends CoreStart {
  onechat: OnechatPluginStart;
}

const buttonCss = css`
  padding: 0px 8px;
`;

export function OnechatNavControl() {
  const {
    services: { onechat, application },
  } = useKibana<OnechatNavControlServices>();

  const hasShowPrivilege = Boolean(
    application?.capabilities?.[ONECHAT_FEATURE_ID]?.[uiPrivileges.show]
  );

  if (!hasShowPrivilege) {
    return null;
  }

  return (
    <EuiToolTip content={buttonLabel}>
      <EuiButton
        css={buttonCss}
        aria-label={buttonLabel}
        data-test-subj="OnechatNavControlButton"
        onClick={() => {
          onechat.openConversationFlyout();
        }}
        color="primary"
        size="s"
        fullWidth={false}
        minWidth={0}
      >
        <RobotIcon size="m" />
      </EuiButton>
    </EuiToolTip>
  );
}

const buttonLabel = i18n.translate('xpack.onechat.navControl.openTheOnechatFlyoutLabel', {
  defaultMessage: 'Open Agent Builder',
});
