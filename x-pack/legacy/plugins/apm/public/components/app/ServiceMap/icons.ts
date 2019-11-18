/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import theme from '@elastic/eui/dist/eui_theme_light.json';
import databaseIcon from './icons/database.svg';
import globeIcon from './icons/globe.svg';

function getAvatarIcon(
  text = '',
  backgroundColor = 'transparent',
  foregroundColor = 'white'
) {
  return (
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(`<svg width="80" height="80" xmlns="http://www.w3.org/2000/svg" xmlns:svg="http://www.w3.org/2000/svg">
  <circle cx="40" cy="40" fill="${backgroundColor}"  r="40" stroke-width="0" />
  <text fill="${foregroundColor}" font-family="'Inter UI', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Helvetica', 'Arial', sans-serif" font-size="36" text-anchor="middle" x="40" xml:space="preserve" y="52">${text}</text>
</svg>
`)
  );
}

// The colors here are taken from the logos of the corresponding technologies
export const icons: { [key: string]: string } = {
  database: databaseIcon,
  dotnet: getAvatarIcon('.N', '#8562AD'),
  external: globeIcon,
  go: getAvatarIcon('Go', '#00A9D6'),
  java: getAvatarIcon('Jv', '#41717E'),
  'js-base': getAvatarIcon('JS', '#F0DB4E', theme.euiTextColor),
  nodejs: getAvatarIcon('No', '#689E62'),
  python: getAvatarIcon('Py', '#376994'),
  ruby: getAvatarIcon('Rb', '#CC362E')
};

export const defaultIcon = getAvatarIcon();
