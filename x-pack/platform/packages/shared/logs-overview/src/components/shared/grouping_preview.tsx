/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiImage } from '@elastic/eui';
import { type ThemeServiceStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import React from 'react';
import useObservable from 'react-use/lib/useObservable';
import { map } from 'rxjs';
import previewImageDark from '../../assets/patterns-example-dark.png';
import previewImageLight from '../../assets/patterns-example-light.png';

export interface GroupingPreviewProps {
  dependencies: GroupingPreviewDependencies;
}

export interface GroupingPreviewDependencies {
  theme: ThemeServiceStart;
}

export const GroupingPreview: React.FC<GroupingPreviewProps> = ({ dependencies }) => {
  const isDarkMode = useObservable(
    dependencies.theme.theme$.pipe(map((currentTheme) => currentTheme.darkMode))
  );

  return isDarkMode ? <GroupingPreviewDark /> : <GroupingPreviewLight />;
};

export const GroupingPreviewLight: React.FC = () => (
  <EuiImage src={previewImageLight} alt={groupingPreviewImageDescription} size="original" />
);

export const GroupingPreviewDark: React.FC = () => (
  <EuiImage src={previewImageDark} alt={groupingPreviewImageDescription} size="original" />
);

const groupingPreviewImageDescription = i18n.translate(
  'xpack.observabilityLogsOverview.groupingPreviewImageDescription',
  {
    defaultMessage: 'Preview of the grouping feature in the Logs Overview',
  }
);
