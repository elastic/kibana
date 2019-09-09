/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { PathReporter } from 'io-ts/lib/PathReporter';
import { isLeft } from 'fp-ts/lib/Either';
import { BeatEvent, RuntimeBeatEvent } from '../../common/domain_types';
import { BeatEventsAdapter } from './adapters/events/adapter_types';
import { FrameworkUser } from './adapters/framework/adapter_types';
import { CMBeatsDomain } from './beats';

export class BeatEventsLib {
  // @ts-ignore
  constructor(private readonly adapter: BeatEventsAdapter, private readonly beats: CMBeatsDomain) {}

  public log = async (
    user: FrameworkUser,
    beatId: string,
    events: BeatEvent[]
  ): Promise<Array<{ success: boolean; reason?: string }>> => {
    return events.map((event, i) => {
      const assertData = RuntimeBeatEvent.decode(event);
      if (isLeft(assertData)) {
        if (events.length - 1 === i) {
          this.beats
            .update(user, beatId, {
              status: {
                ...events[events.length - 2],
                timestamp: new Date(events[events.length - 2].timestamp),
              },
            })
            .catch(e => {
              // eslint-disable-next-line
              console.error('Error inserting event into beats log.', e);
            });
        }
        return {
          success: false,
          error: `Error parsing event ${i}, ${PathReporter.report(assertData)[0]}`,
        };
      }
      if (events.length - 1 === i) {
        this.beats
          .update(user, beatId, {
            status: {
              ...events[events.length - 1],
              timestamp: new Date(events[events.length - 1].timestamp),
            },
          })
          .catch(e => {
            // eslint-disable-next-line
            console.error('Error inserting event into beats log.', e);
          });
      }
      return { success: true };
    });
  };
}
