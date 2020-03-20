/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import cytoscape from 'cytoscape';
import databaseIcon from './icons/database.svg';
import documentsIcon from './icons/documents.svg';
import dotNetIcon from './icons/dot-net.svg';
import globeIcon from './icons/globe.svg';
import goIcon from './icons/go.svg';
import javaIcon from './icons/java.svg';
import nodeJsIcon from './icons/nodejs.svg';
import phpIcon from './icons/php.svg';
import pythonIcon from './icons/python.svg';
import rubyIcon from './icons/ruby.svg';
import rumJsIcon from './icons/rumjs.svg';
import defaultIconImport from './icons/default.svg';

export const defaultIcon = defaultIconImport;

// The colors here are taken from the logos of the corresponding technologies
const icons: { [key: string]: string } = {
  cache: databaseIcon,
  database: databaseIcon,
  external: globeIcon,
  messaging: documentsIcon,
  resource: globeIcon
};

const serviceIcons: { [key: string]: string } = {
  dotnet: dotNetIcon,
  go: goIcon,
  java: javaIcon,
  'js-base': rumJsIcon,
  nodejs: nodeJsIcon,
  php: phpIcon,
  python: pythonIcon,
  ruby: rubyIcon
};

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
    return serviceIcons[node.data('agentName') as string];
  } else if (isIE11) {
    return defaultIcon;
  } else if (icons[type]) {
    return icons[type];
  } else {
    return defaultIcon;
  }
}
