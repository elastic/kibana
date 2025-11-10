/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getProcessedAttachments } from './get_processed_attachments';
import type { UiAttachment } from '../../../embeddable/types';

describe('getProcessedAttachments', () => {
  const mockGetAttachment = jest.fn();
  const mockSetAttachment = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('empty or null attachments', () => {
    it('returns empty array for undefined attachments', async () => {
      const result = await getProcessedAttachments({
        attachments: [],
        getAttachment: mockGetAttachment,
        setAttachment: mockSetAttachment,
      });

      expect(result).toEqual([]);
      expect(mockGetAttachment).not.toHaveBeenCalled();
      expect(mockSetAttachment).not.toHaveBeenCalled();
    });

    it('returns empty array for empty attachments array', async () => {
      const result = await getProcessedAttachments({
        attachments: [],
        getAttachment: mockGetAttachment,
        setAttachment: mockSetAttachment,
      });

      expect(result).toEqual([]);
      expect(mockGetAttachment).not.toHaveBeenCalled();
      expect(mockSetAttachment).not.toHaveBeenCalled();
    });
  });

  describe('new attachments', () => {
    it('includes new attachment when no previous content exists', async () => {
      const mockAttachment: UiAttachment = {
        id: 'att-1',
        type: 'dashboard',
        getContent: jest.fn().mockResolvedValue({ value: 'test' }),
      };

      mockGetAttachment.mockReturnValue(undefined);

      const result = await getProcessedAttachments({
        attachments: [mockAttachment],
        getAttachment: mockGetAttachment,
        setAttachment: mockSetAttachment,
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'att-1',
        type: 'dashboard',
        data: { value: 'test' },
        hidden: true,
      });
      expect(mockGetAttachment).toHaveBeenCalledWith('att-1');
      expect(mockSetAttachment).toHaveBeenCalledWith('att-1', { value: 'test' });
    });

    it('processes multiple new attachments', async () => {
      const mockAttachments: UiAttachment[] = [
        {
          id: 'att-1',
          type: 'dashboard',
          getContent: jest.fn().mockResolvedValue({ value: 'test1' }),
        },
        {
          id: 'att-2',
          type: 'lens',
          getContent: jest.fn().mockResolvedValue({ value: 'test2' }),
        },
      ];

      mockGetAttachment.mockReturnValue(undefined);

      const result = await getProcessedAttachments({
        attachments: mockAttachments,
        getAttachment: mockGetAttachment,
        setAttachment: mockSetAttachment,
      });

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('att-1');
      expect(result[1].id).toBe('att-2');
      expect(mockSetAttachment).toHaveBeenCalledTimes(2);
    });
  });

  describe('unchanged attachments', () => {
    it('filters out attachment with identical content', async () => {
      const content = { value: 'test', nested: { data: 123 } };
      const mockAttachment: UiAttachment = {
        id: 'att-1',
        type: 'dashboard',
        getContent: jest.fn().mockResolvedValue(content),
      };

      mockGetAttachment.mockReturnValue(content);

      const result = await getProcessedAttachments({
        attachments: [mockAttachment],
        getAttachment: mockGetAttachment,
        setAttachment: mockSetAttachment,
      });

      expect(result).toHaveLength(0);
      expect(mockSetAttachment).not.toHaveBeenCalled();
    });

    it('filters out attachment with deep equal content', async () => {
      const previousContent = { value: 'test', nested: { data: [1, 2, 3] } };
      const currentContent = { value: 'test', nested: { data: [1, 2, 3] } };

      const mockAttachment: UiAttachment = {
        id: 'att-1',
        type: 'dashboard',
        getContent: jest.fn().mockResolvedValue(currentContent),
      };

      mockGetAttachment.mockReturnValue(previousContent);

      const result = await getProcessedAttachments({
        attachments: [mockAttachment],
        getAttachment: mockGetAttachment,
        setAttachment: mockSetAttachment,
      });

      expect(result).toHaveLength(0);
      expect(mockSetAttachment).not.toHaveBeenCalled();
    });
  });

  describe('changed attachments', () => {
    it('detects changed content with different values', async () => {
      const mockAttachment: UiAttachment = {
        id: 'att-1',
        type: 'dashboard',
        getContent: jest.fn().mockResolvedValue({ value: 'new' }),
      };

      mockGetAttachment.mockReturnValue({ value: 'old' });

      const result = await getProcessedAttachments({
        attachments: [mockAttachment],
        getAttachment: mockGetAttachment,
        setAttachment: mockSetAttachment,
      });

      expect(result).toHaveLength(1);
      expect(result[0].data).toEqual({ value: 'new' });
      expect(mockSetAttachment).toHaveBeenCalledWith('att-1', { value: 'new' });
    });

    it('detects changed content with added properties', async () => {
      const mockAttachment: UiAttachment = {
        id: 'att-1',
        type: 'dashboard',
        getContent: jest.fn().mockResolvedValue({ value: 'test', newProp: 'added' }),
      };

      mockGetAttachment.mockReturnValue({ value: 'test' });

      const result = await getProcessedAttachments({
        attachments: [mockAttachment],
        getAttachment: mockGetAttachment,
        setAttachment: mockSetAttachment,
      });

      expect(result).toHaveLength(1);
      expect(mockSetAttachment).toHaveBeenCalledWith('att-1', {
        value: 'test',
        newProp: 'added',
      });
    });

    it('detects changed content with removed properties', async () => {
      const mockAttachment: UiAttachment = {
        id: 'att-1',
        type: 'dashboard',
        getContent: jest.fn().mockResolvedValue({ value: 'test' }),
      };

      mockGetAttachment.mockReturnValue({ value: 'test', oldProp: 'removed' });

      const result = await getProcessedAttachments({
        attachments: [mockAttachment],
        getAttachment: mockGetAttachment,
        setAttachment: mockSetAttachment,
      });

      expect(result).toHaveLength(1);
      expect(mockSetAttachment).toHaveBeenCalledWith('att-1', { value: 'test' });
    });

    it('detects changed nested content', async () => {
      const mockAttachment: UiAttachment = {
        id: 'att-1',
        type: 'dashboard',
        getContent: jest.fn().mockResolvedValue({ nested: { changed: 'new' } }),
      };

      mockGetAttachment.mockReturnValue({ nested: { changed: 'old' } });

      const result = await getProcessedAttachments({
        attachments: [mockAttachment],
        getAttachment: mockGetAttachment,
        setAttachment: mockSetAttachment,
      });

      expect(result).toHaveLength(1);
    });
  });

  describe('mixed scenarios', () => {
    it('processes mix of new, changed, and unchanged attachments', async () => {
      const mockAttachments: UiAttachment[] = [
        {
          id: 'att-new',
          type: 'dashboard',
          getContent: jest.fn().mockResolvedValue({ value: 'new' }),
        },
        {
          id: 'att-changed',
          type: 'lens',
          getContent: jest.fn().mockResolvedValue({ value: 'changed-new' }),
        },
        {
          id: 'att-unchanged',
          type: 'map',
          getContent: jest.fn().mockResolvedValue({ value: 'same' }),
        },
      ];

      mockGetAttachment.mockImplementation((id: string) => {
        if (id === 'att-new') return undefined; // New attachment
        if (id === 'att-changed') return { value: 'changed-old' }; // Changed
        if (id === 'att-unchanged') return { value: 'same' }; // Unchanged
        return undefined;
      });

      const result = await getProcessedAttachments({
        attachments: mockAttachments,
        getAttachment: mockGetAttachment,
        setAttachment: mockSetAttachment,
      });

      expect(result).toHaveLength(2); // Only new and changed
      expect(result.map((r) => r.id)).toEqual(['att-new', 'att-changed']);
      expect(mockSetAttachment).toHaveBeenCalledTimes(2);
      expect(mockSetAttachment).not.toHaveBeenCalledWith('att-unchanged', expect.anything());
    });
  });

  describe('error handling', () => {
    it('handles getContent error gracefully', async () => {
      const mockAttachment: UiAttachment = {
        id: 'att-1',
        type: 'dashboard',
        getContent: jest.fn().mockRejectedValue(new Error('Failed to load content')),
      };

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await getProcessedAttachments({
        attachments: [mockAttachment],
        getAttachment: mockGetAttachment,
        setAttachment: mockSetAttachment,
      });

      expect(result).toHaveLength(0);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Failed to fetch content for attachment att-1:',
        expect.any(Error)
      );
      expect(mockSetAttachment).not.toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });

    it('continues processing after error in one attachment', async () => {
      const mockAttachments: UiAttachment[] = [
        {
          id: 'att-error',
          type: 'dashboard',
          getContent: jest.fn().mockRejectedValue(new Error('Failed')),
        },
        {
          id: 'att-success',
          type: 'lens',
          getContent: jest.fn().mockResolvedValue({ value: 'works' }),
        },
      ];

      mockGetAttachment.mockReturnValue(undefined);
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await getProcessedAttachments({
        attachments: mockAttachments,
        getAttachment: mockGetAttachment,
        setAttachment: mockSetAttachment,
      });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('att-success');
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);

      consoleWarnSpy.mockRestore();
    });
  });

  describe('attachment properties', () => {
    it('sets hidden property to true', async () => {
      const mockAttachment: UiAttachment = {
        id: 'att-1',
        type: 'dashboard',
        getContent: jest.fn().mockResolvedValue({ value: 'test' }),
      };

      mockGetAttachment.mockReturnValue(undefined);

      const result = await getProcessedAttachments({
        attachments: [mockAttachment],
        getAttachment: mockGetAttachment,
        setAttachment: mockSetAttachment,
      });

      expect(result[0].hidden).toBe(true);
    });

    it('preserves attachment type', async () => {
      const mockAttachment: UiAttachment = {
        id: 'att-1',
        type: 'custom-type',
        getContent: jest.fn().mockResolvedValue({ value: 'test' }),
      };

      mockGetAttachment.mockReturnValue(undefined);

      const result = await getProcessedAttachments({
        attachments: [mockAttachment],
        getAttachment: mockGetAttachment,
        setAttachment: mockSetAttachment,
      });

      expect(result[0].type).toBe('custom-type');
    });

    it('includes attachment data in result', async () => {
      const contentData = {
        complex: 'data',
        with: { nested: 'structure' },
        and: ['arrays', 'too'],
      };

      const mockAttachment: UiAttachment = {
        id: 'att-1',
        type: 'dashboard',
        getContent: jest.fn().mockResolvedValue(contentData),
      };

      mockGetAttachment.mockReturnValue(undefined);

      const result = await getProcessedAttachments({
        attachments: [mockAttachment],
        getAttachment: mockGetAttachment,
        setAttachment: mockSetAttachment,
      });

      expect(result[0].data).toEqual(contentData);
    });
  });
});
