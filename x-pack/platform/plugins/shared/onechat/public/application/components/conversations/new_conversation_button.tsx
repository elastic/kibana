/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton } from '@elastic/eui';
import { getRouterLinkProps } from '@kbn/router-utils';
import React from 'react';
import { useNavigation } from '../../hooks/use_navigation';
import { appPaths } from '../../utils/app_paths';
import { conversationsCommonLabels } from './i18n';

export const NewConversationButton: React.FC<{}> = () => {
  const { navigateToOnechatUrl } = useNavigation();
  return (
    <EuiButton
      iconType="plus"
      iconSide="left"
      {...getRouterLinkProps({
        href: appPaths.chat.new,
        onClick() {
          navigateToOnechatUrl(appPaths.chat.new);
        },
      })}
    >
      {conversationsCommonLabels.header.createNewConversationButtonLabel}
    </EuiButton>
  );
};
