/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import cytoscape from 'cytoscape';
import { isRumAgentName } from '../../../../../../../plugins/apm/common/agent_name';
import {
  AGENT_NAME,
  SERVICE_NAME,
  SPAN_SUBTYPE,
  SPAN_TYPE
} from '../../../../../../../plugins/apm/common/elasticsearch_fieldnames';
import awsIcon from './icons/aws.svg';
import cassandraIcon from './icons/cassandra.svg';
import databaseIcon from './icons/database.svg';
import defaultIconImport from './icons/default.svg';
import documentsIcon from './icons/documents.svg';
import dotNetIcon from './icons/dot-net.svg';
import elasticsearchIcon from './icons/elasticsearch.svg';
import globeIcon from './icons/globe.svg';
import goIcon from './icons/go.svg';
import graphqlIcon from './icons/graphql.svg';
import grpcIcon from './icons/grpc.svg';
import handlebarsIcon from './icons/handlebars.svg';
import javaIcon from './icons/java.svg';
import kafkaIcon from './icons/kafka.svg';
import mongodbIcon from './icons/mongodb.svg';
import mysqlIcon from './icons/mysql.svg';
import nodeJsIcon from './icons/nodejs.svg';
import phpIcon from './icons/php.svg';
import postgresqlIcon from './icons/postgresql.svg';
import pythonIcon from './icons/python.svg';
import redisIcon from './icons/redis.svg';
import rubyIcon from './icons/ruby.svg';
import rumJsIcon from './icons/rumjs.svg';
import websocketIcon from './icons/websocket.svg';

export const defaultIcon = defaultIconImport;

// The colors here are taken from the logos of the corresponding technologies
const icons: { [key: string]: string } = {
  cache: databaseIcon,
  db: databaseIcon,
  ext: globeIcon,
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
  const type = node.data(SPAN_TYPE);

  if (node.data(SERVICE_NAME)) {
    const agentName = node.data(AGENT_NAME);
    // RUM can have multiple names. Normalize it
    const normalizedAgentName = isRumAgentName(agentName)
      ? 'js-base'
      : agentName;
    return serviceIcons[normalizedAgentName];
  } else if (isIE11) {
    return defaultIcon;
  } else if (
    node.data(SPAN_TYPE) === 'aws' &&
    node.data(SPAN_SUBTYPE) === 'servicename'
  ) {
    return awsIcon;
  } else if (
    node.data(SPAN_TYPE) === 'db' &&
    node.data(SPAN_SUBTYPE) === 'cassandra'
  ) {
    return cassandraIcon;
  } else if (
    node.data(SPAN_TYPE) === 'db' &&
    node.data(SPAN_SUBTYPE) === 'elasticsearch'
  ) {
    return elasticsearchIcon;
  } else if (
    node.data(SPAN_TYPE) === 'external' &&
    node.data(SPAN_SUBTYPE) === 'graphql'
  ) {
    return graphqlIcon;
  } else if (
    node.data(SPAN_TYPE) === 'external' &&
    node.data(SPAN_SUBTYPE) === 'grpc'
  ) {
    return grpcIcon;
  } else if (
    node.data(SPAN_TYPE) === 'template' &&
    node.data(SPAN_SUBTYPE) === 'handlebars'
  ) {
    return handlebarsIcon;
  } else if (
    node.data(SPAN_TYPE) === 'messaging' &&
    node.data(SPAN_SUBTYPE) === 'kafka'
  ) {
    return kafkaIcon;
  } else if (
    node.data(SPAN_TYPE) === 'messaging' &&
    node.data(SPAN_SUBTYPE) === 'jms'
  ) {
    return javaIcon;
  } else if (
    node.data(SPAN_TYPE) === 'db' &&
    node.data(SPAN_SUBTYPE) === 'mongodb'
  ) {
    return mongodbIcon;
  } else if (
    node.data(SPAN_TYPE) === 'db' &&
    node.data(SPAN_SUBTYPE) === 'mysql'
  ) {
    return mysqlIcon;
  } else if (
    node.data(SPAN_TYPE) === 'db' &&
    node.data(SPAN_SUBTYPE) === 'postgresql'
  ) {
    return postgresqlIcon;
  } else if (
    node.data(SPAN_TYPE) === 'db' &&
    node.data(SPAN_SUBTYPE) === 'redis'
  ) {
    return redisIcon;
  } else if (
    node.data(SPAN_TYPE) === 'external' &&
    node.data(SPAN_SUBTYPE) === 'websocket'
  ) {
    return websocketIcon;
  } else if (icons[type]) {
    return icons[type];
  } else {
    return defaultIcon;
  }
}
