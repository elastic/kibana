/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import theme from '@elastic/eui/dist/eui_theme_light.json';
import cytoscape from 'cytoscape';
import databaseIcon from './icons/database.svg';
import documentsIcon from './icons/documents.svg';
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
const icons: { [key: string]: string } = {
  cache: databaseIcon,
  database: databaseIcon,
  external: globeIcon,
  messaging: documentsIcon,
  resource: globeIcon
};

const serviceAbbreviations: { [key: string]: string } = {
  dotnet: '.N',
  go: 'Go',
  java: 'Jv',
  'js-base': 'JS',
  nodejs: 'No',
  python: 'Py',
  ruby: 'Rb'
};

export const defaultIcon = getAvatarIcon();

// IE 11 does not properly load some SVGs, which causes a runtime error and the
// map to not work at all. We would prefer to do some kind of feature detection
// rather than browser detection, but IE 11 does support SVG, just not well
// enough for our use in loading icons.
//
// This method of detecting IE is from a Stack Overflow answer:
// https://stackoverflow.com/a/21825207
//
// @ts-ignore `documentMode` is not recognized as a valid property of `document`.
const isIE11 = !!window.MSInputMethodContext && !!document.documentMode;

export function iconForNode(node: cytoscape.NodeSingular) {
  const type = node.data('type');

  if (type === 'service') {
    return getAvatarIcon(
      serviceAbbreviations[node.data('agentName') as string],
      node.selected() || node.hasClass('primary')
        ? theme.euiColorPrimary
        : theme.euiColorDarkestShade
    );
  } else if (isIE11) {
    return defaultIcon;
  } else {
    return icons[type];
  }
}
