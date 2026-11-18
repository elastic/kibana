/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Agent } from '../types';

import { hasPendingUnenroll, isStuckInUpdating } from './agent_status';

describe('hasPendingUnenroll', () => {
  it('should return false if no unenroll was ever started', () => {
    const agent = {
      active: true,
      status: 'online',
    } as Agent;

    expect(hasPendingUnenroll(agent)).toBe(false);
  });

  it('should return true if an unenroll was started and not acknowledged', () => {
    const agent = {
      active: true,
      status: 'unenrolling',
      unenrollment_started_at: '2022-11-21T12:27:24Z',
    } as Agent;

    expect(hasPendingUnenroll(agent)).toBe(true);
  });

  it('should return false if the unenroll was acknowledged', () => {
    const agent = {
      active: false,
      status: 'unenrolled',
      unenrollment_started_at: '2022-11-21T12:27:24Z',
      unenrolled_at: '2022-11-21T12:29:11Z',
    } as Agent;

    expect(hasPendingUnenroll(agent)).toBe(false);
  });

  it('should return false if the agent was force unenrolled', () => {
    // A forced unenroll writes `unenrolled_at` without ever starting one.
    const agent = {
      active: false,
      status: 'unenrolled',
      unenrolled_at: '2022-11-21T12:29:11Z',
    } as Agent;

    expect(hasPendingUnenroll(agent)).toBe(false);
  });

  it('should not read agent.status, which masks a stalled unenroll', () => {
    // An agent sent an UNENROLL that then goes dark reports `offline`, not `unenrolling`.
    const agent = {
      active: true,
      status: 'offline',
      unenrollment_started_at: '2022-11-21T12:27:24Z',
    } as Agent;

    expect(hasPendingUnenroll(agent)).toBe(true);
  });
});

describe('isStuckInUpdating', () => {
  it('should return true if agent is active and in failed upgrade state', () => {
    const agent = {
      active: true,
      status: 'online',
      upgrade_details: {
        state: 'UPG_FAILED',
      },
    } as Agent;

    expect(isStuckInUpdating(agent)).toBe(true);
  });

  it('should return false if agent is active and in watching upgrade state', () => {
    const agent = {
      active: true,
      status: 'online',
      upgrade_details: {
        state: 'UPG_WATCHING',
      },
    } as Agent;

    expect(isStuckInUpdating(agent)).toBe(false);
  });

  it('should return false if agent is active and in rollback upgrade state', () => {
    const agent = {
      active: true,
      status: 'online',
      upgrade_details: {
        state: 'UPG_ROLLBACK',
      },
    } as Agent;

    expect(isStuckInUpdating(agent)).toBe(false);
  });

  it('should return false if agent is updating and in schedule upgrade state', () => {
    const agent = {
      active: true,
      status: 'updating',
      upgrade_started_at: '2022-11-21T12:27:24Z',
      upgrade_details: {
        state: 'UPG_SCHEDULED',
      },
    } as Agent;

    expect(isStuckInUpdating(agent)).toBe(false);
  });

  it('should return false if agent is updating and in downloading upgrade state', () => {
    const agent = {
      active: true,
      status: 'updating',
      upgrade_started_at: '2022-11-21T12:27:24Z',
      upgrade_details: {
        state: 'UPG_DOWNLOADING',
      },
    } as Agent;

    expect(isStuckInUpdating(agent)).toBe(false);
  });

  it('should return true if agent is updating no upgrade details state', () => {
    const agent = {
      active: true,
      status: 'updating',
      upgrade_started_at: '2022-11-21T12:27:24Z',
    } as Agent;

    expect(isStuckInUpdating(agent)).toBe(true);
  });
});
