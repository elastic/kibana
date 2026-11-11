/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useMemo } from 'react';
import { AppHeader, type AppHeaderMenu } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';

interface HeaderProps {
  canCreate: boolean;
  onCreate: () => void;
}

export const Header: FC<HeaderProps> = ({ canCreate, onCreate }) => {
  const menu = useMemo<AppHeaderMenu | undefined>(() => {
    if (!canCreate) {
      return undefined;
    }

    return {
      primaryActionItem: {
        id: 'createTag',
        label: i18n.translate('xpack.savedObjectsTagging.management.actions.createTagButton', {
          defaultMessage: 'Create tag',
        }),
        iconType: 'tag',
        testId: 'createTagButton',
        run: onCreate,
      },
    };
  }, [canCreate, onCreate]);

  return (
    <AppHeader
      title={i18n.translate('xpack.savedObjectsTagging.management.headerTitle', {
        defaultMessage: 'Tags',
      })}
      description={i18n.translate('xpack.savedObjectsTagging.management.headerDescription', {
        defaultMessage: 'Use tags to categorize and easily find your objects.',
      })}
      spacing="bleed"
      menu={menu}
    />
  );
};
