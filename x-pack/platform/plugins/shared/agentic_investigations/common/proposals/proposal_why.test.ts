/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildProposalComment, parseProposalComment } from './proposal_why';

describe('proposal comment', () => {
  it('round-trips the what and the why', () => {
    const why = {
      how: 'Run:\n\n```\nkubectl get pods\n```',
      explanation: 'Batches pass the **16 MB** limit, so this finds what grew them.',
      event_ids: ['failure:kafka:2026-10-30T17:00'],
      hypotheses: ['Oversized records rejected by Kafka'],
      blind_spot: 'Why the batch grew',
    };
    const comment = buildProposalComment('Lower the batch size.\n\n- step one', why);
    expect(parseProposalComment(comment)).toEqual({ what: 'Lower the batch size.\n\n- step one', why });
  });

  it('leaves a comment with no why, or a mangled one, as the what', () => {
    expect(buildProposalComment('Do it.', {})).toBe('Do it.');
    expect(parseProposalComment('Do it.')).toEqual({ what: 'Do it.' });
    expect(parseProposalComment('Do it.\n\n[nightshift-why]: #%E0%A4%A')).toEqual({
      what: 'Do it.',
    });
  });

  it('hides the why from a Markdown renderer: it is only a link reference definition', () => {
    expect(buildProposalComment('Do it.', { blind_spot: 'x' })).toMatch(
      /\n\n\[nightshift-why\]: #\S+$/
    );
  });
});
