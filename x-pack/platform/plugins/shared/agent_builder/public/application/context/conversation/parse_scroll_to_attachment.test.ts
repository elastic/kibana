/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseScrollToAttachment, removeScrollToAttachment } from './parse_scroll_to_attachment';

describe('parseScrollToAttachment', () => {
  it('reads the attachment id and version', () => {
    expect(
      parseScrollToAttachment('?scrollToAttachmentId=att-1&scrollToAttachmentVersion=2')
    ).toEqual({ id: 'att-1', version: 2 });
  });

  it('reads the attachment id alone when no version is given', () => {
    expect(parseScrollToAttachment('?scrollToAttachmentId=att-1')).toEqual({ id: 'att-1' });
  });

  it.each(['abc', '1.5', ''])('drops a version of %p', (version) => {
    expect(
      parseScrollToAttachment(`?scrollToAttachmentId=att-1&scrollToAttachmentVersion=${version}`)
    ).toEqual({ id: 'att-1' });
  });

  it('decodes the attachment id', () => {
    expect(parseScrollToAttachment('?scrollToAttachmentId=a%3Ab%20c')).toEqual({ id: 'a:b c' });
  });

  it('returns nothing without an attachment id', () => {
    expect(parseScrollToAttachment('?openConversationDetails=true')).toBeUndefined();
    expect(parseScrollToAttachment('')).toBeUndefined();
  });
});

describe('removeScrollToAttachment', () => {
  it('removes only the scroll-to-attachment params', () => {
    expect(
      removeScrollToAttachment(
        '?openConversationDetails=true&scrollToAttachmentId=att-1&scrollToAttachmentVersion=2'
      )
    ).toBe('openConversationDetails=true');
  });

  it('returns an empty search when nothing else is left', () => {
    expect(removeScrollToAttachment('?scrollToAttachmentId=att-1')).toBe('');
  });
});
