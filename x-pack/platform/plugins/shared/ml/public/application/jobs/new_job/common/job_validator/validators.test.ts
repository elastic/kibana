/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Subject, of } from 'rxjs';
import { jobIdValidator } from './validators';

describe('jobIdValidator', () => {
  const makeMlApi = (responses: Record<string, boolean>) => ({
    jobs: {
      jobsExist$: (ids: string[]) =>
        of(
          ids.reduce((acc, id) => {
            acc[id] = { exists: responses[id] ?? false };
            return acc;
          }, {} as any)
        ),
    },
  });

  const makeJobCreator = (jobId: string, mlApi: any) => ({ jobId, mlApi } as any);

  it('emits valid=true when id does not exist', (done) => {
    const mlApi = makeMlApi({}); // no existing ids
    const source$ = new Subject<any>();
    jobIdValidator(source$).subscribe((v) => {
      expect(v?.jobIdExists.valid).toBe(true);
      done();
    });
    source$.next(makeJobCreator('new_id', mlApi));
  });

  it('emits valid=false when id exists', (done) => {
    const mlApi = makeMlApi({ taken_id: true });
    const source$ = new Subject<any>();
    jobIdValidator(source$).subscribe((v) => {
      expect(v?.jobIdExists.valid).toBe(false);
      expect(v?.jobIdExists.message).toBeDefined();
      done();
    });
    source$.next(makeJobCreator('taken_id', mlApi));
  });

  it('suppresses emission when jobId unchanged', () => {
    const mlApi = makeMlApi({});
    const source$ = new Subject<any>();
    const emissions: any[] = [];
    jobIdValidator(source$).subscribe((v) => emissions.push(v));

    const jc = makeJobCreator('same_id', mlApi);
    source$.next(jc);
    source$.next(jc); // same ref, same id
    source$.next(makeJobCreator('same_id', mlApi)); // new ref, same id

    expect(emissions.length).toBe(1);
  });

  it('emits again when jobId changes', () => {
    const mlApi = makeMlApi({ taken_id: true });
    const source$ = new Subject<any>();
    const emissions: any[] = [];
    jobIdValidator(source$).subscribe((v) => emissions.push(v));

    source$.next(makeJobCreator('free_id', mlApi)); // valid
    source$.next(makeJobCreator('taken_id', mlApi)); // invalid

    expect(emissions).toHaveLength(2);
    expect(emissions[0].jobIdExists.valid).toBe(true);
    expect(emissions[1].jobIdExists.valid).toBe(false);
  });
});
