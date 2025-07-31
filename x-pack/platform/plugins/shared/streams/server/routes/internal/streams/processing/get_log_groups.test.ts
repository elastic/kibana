/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getLogGroups, sortByProbability, getVariedSamples, LogGroup } from './get_log_groups';
import cloneDeep from 'lodash/cloneDeep';

const sampleMessages = [
  '[Tue Apr 22 09:28:31 2025] [error] [client 211.62.201.48] Directory index forbidden by rule: /var/www/html/',
  '[Tue Apr 22 09:28:29 2025] [error] [client 218.62.18.218] Directory index forbidden by rule: /var/www/html/',
  "[Tue Apr 22 09:28:07 2025] [error] jk2_init() Can't find child 2085 in scoreboard",
  '[Tue Apr 22 09:28:07 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
  '[Tue Apr 22 09:28:07 2025] [error] mod_jk child init 1 -2',
  "[Tue Apr 22 09:28:07 2025] [error] jk2_init() Can't find child 2086 in scoreboard",
  '[Tue Apr 22 09:28:07 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
  '[Tue Apr 22 09:28:07 2025] [error] mod_jk child init 1 -2',
  "[Tue Apr 22 09:28:07 2025] [error] jk2_init() Can't find child 2087 in scoreboard",
  '[Tue Apr 22 09:28:07 2025] [notice] jk2_init() Found child 2084 in scoreboard slot 9',
  '[Tue Apr 22 09:28:07 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
  '[Tue Apr 22 09:28:07 2025] [error] mod_jk child workerEnv in error state 7',
  '[Tue Apr 22 09:28:07 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
  '[Tue Apr 22 09:28:07 2025] [error] mod_jk child init 1 -2',
  '[Tue Apr 22 09:28:07 2025] [notice] jk2_init() Found child 2081 in scoreboard slot 6',
  "[Tue Apr 22 09:28:07 2025] [error] jk2_init() Can't find child 2082 in scoreboard",
  '[Tue Apr 22 09:28:07 2025] [notice] jk2_init() Found child 2083 in scoreboard slot 8',
  '[Tue Apr 22 09:28:07 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
  '[Tue Apr 22 09:28:07 2025] [error] mod_jk child workerEnv in error state 6',
  '[Tue Apr 22 09:28:07 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
  '[Tue Apr 22 09:28:07 2025] [error] mod_jk child init 1 -2',
  '[Tue Apr 22 09:28:07 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
  '[Tue Apr 22 09:28:07 2025] [error] mod_jk child workerEnv in error state 9',
  '[Tue Apr 22 09:28:07 2025] [notice] jk2_init() Found child 2061 in scoreboard slot 8',
  // Add some outlier messages
  '04-07 14:38:40.342  1702  1820 I DisplayPowerController: HBM brightnessOut =38',
  '04-07 14:38:40.342  1702  1820 D DisplayPowerController: Animating brightness: target=38, rate=200',
  '04-07 14:38:40.341  2227  2227 I PanelView: onInterceptTouchEvent MotionEvent { action=ACTION_UP, actionButton=0, id[0]=0, x[0]=622.0, y[0]=86.0, toolType[0]=TOOL_TYPE_FINGER, buttonState=0, metaState=0, flags=0x0, edgeFlags=0x0, pointerCount=1, historySize=0, eventTime=261991368, downTime=261991304, deviceId=3, source=0x1002 }, mBlockTouches=false',
  '04-07 14:38:40.341  1702  1820 I DisplayPowerController: HBM brightnessIn =38',
  '04-07 14:38:40.285  2227  2227 I StackScrollAlgorithm: updateDimmedActivatedHideSensitive overlap:false',
  '[Tue Apr 22 09:28:07 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
  '[Tue Apr 22 09:28:07 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
  '[Tue Apr 22 09:28:07 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
  '[Tue Apr 22 09:28:07 2025] [error] mod_jk child workerEnv in error state 6',
  '[Tue Apr 22 09:28:07 2025] [error] mod_jk child workerEnv in error state 6',
  '[Tue Apr 22 09:28:07 2025] [error] mod_jk child workerEnv in error state 7',
  '[Tue Apr 22 09:28:07 2025] [notice] jk2_init() Found child 2032 in scoreboard slot 9',
  '[Tue Apr 22 09:28:07 2025] [notice] jk2_init() Found child 2030 in scoreboard slot 6',
  '[Tue Apr 22 09:28:07 2025] [notice] jk2_init() Found child 2031 in scoreboard slot 7',
  '[Tue Apr 22 09:28:06 2025] [error] mod_jk child workerEnv in error state 6',
  '[Tue Apr 22 09:28:06 2025] [error] mod_jk child workerEnv in error state 6',
  '[Tue Apr 22 09:28:06 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
  '[Tue Apr 22 09:28:06 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
  '[Tue Apr 22 09:28:06 2025] [notice] jk2_init() Found child 2028 in scoreboard slot 9',
  '[Tue Apr 22 09:28:06 2025] [notice] jk2_init() Found child 2027 in scoreboard slot 7',
  '[Tue Apr 22 09:28:06 2025] [notice] jk2_init() Found child 2029 in scoreboard slot 8',
  '[Tue Apr 22 09:28:06 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
  '[Tue Apr 22 09:28:06 2025] [error] mod_jk child workerEnv in error state 7',
  '[Tue Apr 22 09:28:06 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
  '[Tue Apr 22 09:28:06 2025] [error] mod_jk child workerEnv in error state 9',
  '[Tue Apr 22 09:28:06 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
  '[Tue Apr 22 09:28:06 2025] [error] mod_jk child workerEnv in error state 7',
  '[Tue Apr 22 09:28:06 2025] [notice] jk2_init() Found child 2008 in scoreboard slot 6',
  '[Tue Apr 22 09:28:06 2025] [notice] jk2_init() Found child 2007 in scoreboard slot 8',
  '[Tue Apr 22 09:28:06 2025] [notice] jk2_init() Found child 2006 in scoreboard slot 9',
  '[Tue Apr 22 09:28:06 2025] [error] mod_jk child workerEnv in error state 6',
  '[Tue Apr 22 09:28:06 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
  '[Tue Apr 22 09:28:06 2025] [notice] jk2_init() Found child 2005 in scoreboard slot 7',
  '[Tue Apr 22 09:28:06 2025] [notice] jk2_init() Found child 2004 in scoreboard slot 6',
  '[Tue Apr 22 09:28:06 2025] [notice] jk2_init() Found child 2002 in scoreboard slot 8',
  '[Tue Apr 22 09:28:06 2025] [notice] jk2_init() Found child 2001 in scoreboard slot 9',
  '[Tue Apr 22 09:28:06 2025] [error] mod_jk child workerEnv in error state 10',
  '[Tue Apr 22 09:28:06 2025] [error] mod_jk child workerEnv in error state 6',
  '[Tue Apr 22 09:28:06 2025] [error] mod_jk child workerEnv in error state 10',
  '[Tue Apr 22 09:28:06 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
  '[Tue Apr 22 09:28:06 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
  '[Tue Apr 22 09:28:06 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
  '[Tue Apr 22 09:28:06 2025] [notice] jk2_init() Found child 1999 in scoreboard slot 6',
  '[Tue Apr 22 09:28:06 2025] [notice] jk2_init() Found child 2000 in scoreboard slot 7',
  '[Tue Apr 22 09:28:06 2025] [notice] jk2_init() Found child 1998 in scoreboard slot 9',
  '[Tue Apr 22 09:28:06 2025] [notice] jk2_init() Found child 1990 in scoreboard slot 9',
  '[Tue Apr 22 09:28:06 2025] [notice] jk2_init() Found child 1984 in scoreboard slot 10',
  '[Tue Apr 22 09:28:06 2025] [notice] jk2_init() Found child 1970 in scoreboard slot 6',
  '[Tue Apr 22 09:28:06 2025] [notice] jk2_init() Found child 1966 in scoreboard slot 6',
  '[Tue Apr 22 09:28:06 2025] [notice] jk2_init() Found child 1967 in scoreboard slot 9',
  '[Tue Apr 22 09:28:06 2025] [notice] jk2_init() Found child 1965 in scoreboard slot 8',
  '[Tue Apr 22 09:28:06 2025] [notice] jk2_init() Found child 1964 in scoreboard slot 7',
  '[Tue Apr 22 09:28:06 2025] [notice] jk2_init() Found child 1962 in scoreboard slot 6',
  '[Tue Apr 22 09:28:06 2025] [notice] jk2_init() Found child 1963 in scoreboard slot 9',
  '[Tue Apr 22 09:28:06 2025] [notice] jk2_init() Found child 1961 in scoreboard slot 8',
  '[Tue Apr 22 09:28:06 2025] [notice] jk2_init() Found child 1959 in scoreboard slot 9',
  '[Tue Apr 22 09:28:06 2025] [notice] jk2_init() Found child 1958 in scoreboard slot 6',
  '[Tue Apr 22 09:28:06 2025] [error] mod_jk child workerEnv in error state 6',
  '[Tue Apr 22 09:28:06 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
  '[Tue Apr 22 09:28:06 2025] [notice] jk2_init() Found child 1957 in scoreboard slot 8',
  '[Tue Apr 22 09:28:05 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
  '[Tue Apr 22 09:28:05 2025] [error] mod_jk child workerEnv in error state 8',
  '[Tue Apr 22 09:28:05 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
  '[Tue Apr 22 09:28:05 2025] [error] mod_jk child workerEnv in error state 8',
  '[Tue Apr 22 09:28:05 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
  '[Tue Apr 22 09:28:05 2025] [error] mod_jk child workerEnv in error state 6',
  '[Tue Apr 22 09:28:05 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
  '[Tue Apr 22 09:28:05 2025] [error] mod_jk child workerEnv in error state 7',
  '[Tue Apr 22 09:28:05 2025] [notice] jk2_init() Found child 1950 in scoreboard slot 9',
  '[Tue Apr 22 09:28:05 2025] [notice] jk2_init() Found child 1951 in scoreboard slot 7',
  '[Tue Apr 22 09:28:05 2025] [notice] jk2_init() Found child 1949 in scoreboard slot 6',
  '[Tue Apr 22 09:28:05 2025] [notice] jk2_init() Found child 1948 in scoreboard slot 8',
  '[Tue Apr 22 09:28:05 2025] [notice] jk2_init() Found child 1938 in scoreboard slot 9',
  '[Tue Apr 22 09:28:05 2025] [notice] jk2_init() Found child 1937 in scoreboard slot 6',
  '[Tue Apr 22 09:28:05 2025] [error] mod_jk child workerEnv in error state 7',
  '[Tue Apr 22 09:28:05 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
];

const expectedGroups: LogGroup[] = [
  {
    pattern: '[a 0 0:0:0 0] [a] ',
    probability: 0.95,
    logs: [],
    children: [
      {
        pattern: '[a 0 0:0:0 0] [a] [a 0.0.0.0] a: /a',
        probability: 0.019999999999999997,
        logs: [
          '[Tue Apr 22 09:28:31 2025] [error] [client 211.62.201.48] Directory index forbidden by rule: /var/www/html/',
          '[Tue Apr 22 09:28:29 2025] [error] [client 218.62.18.218] Directory index forbidden by rule: /var/www/html/',
        ],
        children: [],
      },
      {
        pattern: '[a 0 0:0:0 0] [a] a() ',
        probability: 0.6799999999999999,
        logs: [
          "[Tue Apr 22 09:28:07 2025] [error] jk2_init() Can't find child 2085 in scoreboard",
          "[Tue Apr 22 09:28:07 2025] [error] jk2_init() Can't find child 2086 in scoreboard",
          "[Tue Apr 22 09:28:07 2025] [error] jk2_init() Can't find child 2087 in scoreboard",
          "[Tue Apr 22 09:28:07 2025] [error] jk2_init() Can't find child 2082 in scoreboard",
          '[Tue Apr 22 09:28:07 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
          '[Tue Apr 22 09:28:06 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
          '[Tue Apr 22 09:28:05 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
          '[Tue Apr 22 09:28:07 2025] [notice] jk2_init() Found child 2084 in scoreboard slot 9',
          '[Tue Apr 22 09:28:07 2025] [notice] jk2_init() Found child 2081 in scoreboard slot 6',
          '[Tue Apr 22 09:28:07 2025] [notice] jk2_init() Found child 2083 in scoreboard slot 8',
          '[Tue Apr 22 09:28:07 2025] [notice] jk2_init() Found child 2061 in scoreboard slot 8',
          '[Tue Apr 22 09:28:07 2025] [notice] jk2_init() Found child 2032 in scoreboard slot 9',
          '[Tue Apr 22 09:28:07 2025] [notice] jk2_init() Found child 2030 in scoreboard slot 6',
          '[Tue Apr 22 09:28:07 2025] [notice] jk2_init() Found child 2031 in scoreboard slot 7',
          '[Tue Apr 22 09:28:06 2025] [notice] jk2_init() Found child 2028 in scoreboard slot 9',
          '[Tue Apr 22 09:28:06 2025] [notice] jk2_init() Found child 2027 in scoreboard slot 7',
          '[Tue Apr 22 09:28:06 2025] [notice] jk2_init() Found child 2029 in scoreboard slot 8',
          '[Tue Apr 22 09:28:06 2025] [notice] jk2_init() Found child 2008 in scoreboard slot 6',
          '[Tue Apr 22 09:28:06 2025] [notice] jk2_init() Found child 2007 in scoreboard slot 8',
          '[Tue Apr 22 09:28:06 2025] [notice] jk2_init() Found child 2006 in scoreboard slot 9',
          '[Tue Apr 22 09:28:06 2025] [notice] jk2_init() Found child 2005 in scoreboard slot 7',
          '[Tue Apr 22 09:28:06 2025] [notice] jk2_init() Found child 2004 in scoreboard slot 6',
          '[Tue Apr 22 09:28:06 2025] [notice] jk2_init() Found child 2002 in scoreboard slot 8',
          '[Tue Apr 22 09:28:06 2025] [notice] jk2_init() Found child 2001 in scoreboard slot 9',
          '[Tue Apr 22 09:28:06 2025] [notice] jk2_init() Found child 1999 in scoreboard slot 6',
          '[Tue Apr 22 09:28:06 2025] [notice] jk2_init() Found child 2000 in scoreboard slot 7',
          '[Tue Apr 22 09:28:06 2025] [notice] jk2_init() Found child 1998 in scoreboard slot 9',
          '[Tue Apr 22 09:28:06 2025] [notice] jk2_init() Found child 1990 in scoreboard slot 9',
          '[Tue Apr 22 09:28:06 2025] [notice] jk2_init() Found child 1984 in scoreboard slot 10',
          '[Tue Apr 22 09:28:06 2025] [notice] jk2_init() Found child 1970 in scoreboard slot 6',
          '[Tue Apr 22 09:28:06 2025] [notice] jk2_init() Found child 1966 in scoreboard slot 6',
          '[Tue Apr 22 09:28:06 2025] [notice] jk2_init() Found child 1967 in scoreboard slot 9',
          '[Tue Apr 22 09:28:06 2025] [notice] jk2_init() Found child 1965 in scoreboard slot 8',
          '[Tue Apr 22 09:28:06 2025] [notice] jk2_init() Found child 1964 in scoreboard slot 7',
          '[Tue Apr 22 09:28:06 2025] [notice] jk2_init() Found child 1962 in scoreboard slot 6',
          '[Tue Apr 22 09:28:06 2025] [notice] jk2_init() Found child 1963 in scoreboard slot 9',
          '[Tue Apr 22 09:28:06 2025] [notice] jk2_init() Found child 1961 in scoreboard slot 8',
          '[Tue Apr 22 09:28:06 2025] [notice] jk2_init() Found child 1959 in scoreboard slot 9',
          '[Tue Apr 22 09:28:06 2025] [notice] jk2_init() Found child 1958 in scoreboard slot 6',
          '[Tue Apr 22 09:28:06 2025] [notice] jk2_init() Found child 1957 in scoreboard slot 8',
          '[Tue Apr 22 09:28:05 2025] [notice] jk2_init() Found child 1950 in scoreboard slot 9',
          '[Tue Apr 22 09:28:05 2025] [notice] jk2_init() Found child 1951 in scoreboard slot 7',
          '[Tue Apr 22 09:28:05 2025] [notice] jk2_init() Found child 1949 in scoreboard slot 6',
          '[Tue Apr 22 09:28:05 2025] [notice] jk2_init() Found child 1948 in scoreboard slot 8',
          '[Tue Apr 22 09:28:05 2025] [notice] jk2_init() Found child 1938 in scoreboard slot 9',
          '[Tue Apr 22 09:28:05 2025] [notice] jk2_init() Found child 1937 in scoreboard slot 6',
        ],
        children: [],
      },
      {
        pattern: '[a 0 0:0:0 0] [a] a 0',
        probability: 0.24999999999999997,
        logs: [
          '[Tue Apr 22 09:28:07 2025] [error] mod_jk child init 1 -2',
          '[Tue Apr 22 09:28:07 2025] [error] mod_jk child workerEnv in error state 7',
          '[Tue Apr 22 09:28:07 2025] [error] mod_jk child workerEnv in error state 6',
          '[Tue Apr 22 09:28:07 2025] [error] mod_jk child workerEnv in error state 9',
          '[Tue Apr 22 09:28:06 2025] [error] mod_jk child workerEnv in error state 6',
          '[Tue Apr 22 09:28:06 2025] [error] mod_jk child workerEnv in error state 7',
          '[Tue Apr 22 09:28:06 2025] [error] mod_jk child workerEnv in error state 9',
          '[Tue Apr 22 09:28:06 2025] [error] mod_jk child workerEnv in error state 10',
          '[Tue Apr 22 09:28:05 2025] [error] mod_jk child workerEnv in error state 8',
          '[Tue Apr 22 09:28:05 2025] [error] mod_jk child workerEnv in error state 6',
          '[Tue Apr 22 09:28:05 2025] [error] mod_jk child workerEnv in error state 7',
        ],
        children: [],
      },
    ],
  },
  {
    pattern: '0-0 0:0:0.0 0 0 a: ',
    probability: 0.05,
    logs: [],
    children: [
      {
        pattern: '0-0 0:0:0.0 0 0 a: a ',
        probability: 0.03,
        logs: [
          '04-07 14:38:40.342  1702  1820 I DisplayPowerController: HBM brightnessOut =38',
          '04-07 14:38:40.341  1702  1820 I DisplayPowerController: HBM brightnessIn =38',
          '04-07 14:38:40.341  2227  2227 I PanelView: onInterceptTouchEvent MotionEvent { action=ACTION_UP, actionButton=0, id[0]=0, x[0]=622.0, y[0]=86.0, toolType[0]=TOOL_TYPE_FINGER, buttonState=0, metaState=0, flags=0x0, edgeFlags=0x0, pointerCount=1, historySize=0, eventTime=261991368, downTime=261991304, deviceId=3, source=0x1002 }, mBlockTouches=false',
        ],
        children: [],
      },
      {
        pattern: '0-0 0:0:0.0 0 0 a: a: a=0, a=0',
        probability: 0.010000000000000002,
        logs: [
          '04-07 14:38:40.342  1702  1820 D DisplayPowerController: Animating brightness: target=38, rate=200',
        ],
        children: [],
      },
      {
        pattern: '0-0 0:0:0.0 0 0 a: a:a',
        probability: 0.010000000000000002,
        logs: [
          '04-07 14:38:40.285  2227  2227 I StackScrollAlgorithm: updateDimmedActivatedHideSensitive overlap:false',
        ],
        children: [],
      },
    ],
  },
];

describe('getLogGroups', () => {
  it('should group a list of logs by pattern and calculates their probability', () => {
    expect(getLogGroups(sampleMessages, 2)).toEqual(expectedGroups);
  });
});

describe('sortByProbability', () => {
  it('should recursively sort log groups by probability in descending order', () => {
    const sorted = cloneDeep(expectedGroups); // Sorting mutates the source object so need to clone it first
    sortByProbability(sorted);
    expect(sorted).toEqual([
      {
        pattern: '[a 0 0:0:0 0] [a] ',
        probability: 0.95,
        logs: expect.any(Array),
        children: [
          {
            pattern: '[a 0 0:0:0 0] [a] a() ',
            probability: 0.6799999999999999,
            logs: expect.any(Array),
            children: [],
          },
          {
            pattern: '[a 0 0:0:0 0] [a] a 0',
            probability: 0.24999999999999997,
            logs: expect.any(Array),
            children: [],
          },
          {
            pattern: '[a 0 0:0:0 0] [a] [a 0.0.0.0] a: /a',
            probability: 0.019999999999999997,
            logs: expect.any(Array),
            children: [],
          },
        ],
      },
      {
        pattern: '0-0 0:0:0.0 0 0 a: ',
        probability: 0.05,
        logs: expect.any(Array),
        children: [
          {
            pattern: '0-0 0:0:0.0 0 0 a: a ',
            probability: 0.03,
            logs: expect.any(Array),
            children: [],
          },
          {
            pattern: '0-0 0:0:0.0 0 0 a: a: a=0, a=0',
            probability: 0.010000000000000002,
            logs: expect.any(Array),
            children: [],
          },
          {
            pattern: '0-0 0:0:0.0 0 0 a: a:a',
            probability: 0.010000000000000002,
            logs: expect.any(Array),
            children: [],
          },
        ],
      },
    ]);
  });
});

describe('getVariedSamples', () => {
  // `getVariedSamples` assumes that the input is already sorted by probability so we need to sort it first
  const sorted = cloneDeep(expectedGroups); // Sorting mutates the source object so need to clone it first
  sortByProbability(sorted);

  describe('Apache logs', () => {
    it('should return a list of sample logs ensuring each pattern group is represented evenly', () => {
      expect(getVariedSamples(sorted[0], 10)).toEqual([
        // Logs from group 1 should be present in sample of 10
        "[Tue Apr 22 09:28:07 2025] [error] jk2_init() Can't find child 2085 in scoreboard",
        "[Tue Apr 22 09:28:07 2025] [error] jk2_init() Can't find child 2086 in scoreboard",
        "[Tue Apr 22 09:28:07 2025] [error] jk2_init() Can't find child 2087 in scoreboard",
        "[Tue Apr 22 09:28:07 2025] [error] jk2_init() Can't find child 2082 in scoreboard",
        // Logs from group 2 should be present in sample of 10
        '[Tue Apr 22 09:28:07 2025] [error] mod_jk child init 1 -2',
        '[Tue Apr 22 09:28:07 2025] [error] mod_jk child workerEnv in error state 7',
        '[Tue Apr 22 09:28:07 2025] [error] mod_jk child workerEnv in error state 6',
        // Logs from group 3 should be present in sample of 10
        '[Tue Apr 22 09:28:31 2025] [error] [client 211.62.201.48] Directory index forbidden by rule: /var/www/html/',
        '[Tue Apr 22 09:28:29 2025] [error] [client 218.62.18.218] Directory index forbidden by rule: /var/www/html/',
      ]);
    });
  });
});
