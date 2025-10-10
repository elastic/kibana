/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ClassifiedChunk } from './chunk_decision_buffer';
import { ChunkDecisionBuffer, ChunkType } from './chunk_decision_buffer';

describe('ChunkDecisionBuffer', () => {
  let buffer: ChunkDecisionBuffer;
  const toolReasoningTag = '<tool_reasoning>';

  beforeEach(() => {
    buffer = new ChunkDecisionBuffer({ tag: toolReasoningTag });
  });

  // Helper function to process a stream of chunks and collect all outputs
  const processStream = (chunks: string[]) => {
    const output: ClassifiedChunk[] = [];
    for (const chunk of chunks) {
      const result = buffer.process(chunk);
      if (result) {
        output.push(...result);
      }
    }
    // After the stream, flush any remaining text from the internal buffer
    const finalFlush = buffer.flush();
    if (finalFlush) {
      output.push(...finalFlush);
    }
    return output;
  };

  it('should correctly classify and stream a simple final answer', () => {
    const chunks = ['This ', 'is ', 'a final answer.'];
    const result = processStream(chunks);
    expect(result.map((r) => r.text).join('')).toEqual('This is a final answer.');
    expect(result[0].type).toEqual(ChunkType.FinalAnswer);
  });

  it('should correctly classify and stream a simple tool reasoning message', () => {
    const chunks = [toolReasoningTag, 'Searching ', 'for ', 'documents.'];
    const result = processStream(chunks);
    expect(result.map((r) => r.text).join('')).toEqual('Searching for documents.');
    expect(result[0].type).toEqual(ChunkType.ToolReasoning);
  });

  it('should suppress output while buffering and then flush with correct type', () => {
    expect(buffer.process('This is')).toBe(null); // Buffering, not enough to decide
    expect(buffer.process(' a test.')).toBe(null); // Still buffering, should be null
    const resultFromFlush = buffer.flush(); // Flush now handles the buffered content

    expect(resultFromFlush).toEqual([{ type: ChunkType.FinalAnswer, text: 'This is a test.' }]);
  });

  it('should handle the opening tag being split across chunks', () => {
    const chunks = ['<tool_rea', 'soning>', 'Okay, ', 'I will search.'];
    const result = processStream(chunks);
    expect(result.map((r) => r.text).join('')).toEqual('Okay, I will search.');
  });

  it('should handle the closing tag being split across two chunks', () => {
    const chunks = [toolReasoningTag, 'Searching... ', 'and done.</tool_rea', 'soning>'];
    const result = processStream(chunks);
    expect(result.map((r) => r.text).join('')).toEqual('Searching... and done.');
  });

  it('should handle the closing tag being split across multiple chunks', () => {
    const chunks = [
      toolReasoningTag,
      'Searching... ',
      'and done.</',
      'tool_rea',
      'soning>',
      ' some trailing text.',
    ];
    const result = processStream(chunks);
    expect(result.map((r) => r.text).join('')).toEqual(
      'Searching... and done. some trailing text.'
    );
  });

  it('should handle a stream that ends mid-tag, flushing the clean part', () => {
    const chunks = ['<tool_reasoning>', 'Searching...</tool_rea'];
    const result = processStream(chunks);
    expect(result.map((r) => r.text).join('')).toEqual('Searching...');
  });

  it('should correctly reset its state for a new stream', () => {
    processStream([toolReasoningTag, 'First task.']);
    buffer.reset();
    const result2 = processStream(['Second ', 'task is a final answer.']);

    expect(result2.map((r) => r.text).join('')).toEqual('Second task is a final answer.');
    expect(result2[0].type).toEqual(ChunkType.FinalAnswer);
  });

  it('should not emit anything if the stream is only an opening tag', () => {
    const chunks = ['<tool_rea', 'soning>'];
    const result = processStream(chunks);
    expect(result).toEqual([]);
  });

  it('should not emit anything if the stream is only a closing tag', () => {
    const chunks = ['</tool_rea', 'soning>'];
    const result = processStream(chunks);
    expect(result).toEqual([]);
  });

  it('should flush remaining text that is not a partial tag', () => {
    const chunks = ['Final chunk of text'];
    const result = processStream(chunks);
    expect(result.map((r) => r.text).join('')).toEqual('Final chunk of text');
  });

  it('should correctly handle a long stream that triggers a decision then continues', () => {
    const chunks = [
      'This is the first part of a long message, ',
      'long enough to make a decision. ',
      'And this is the second part.',
    ];
    const result = processStream(chunks);
    expect(result.map((r) => r.text).join('')).toEqual(
      'This is the first part of a long message, long enough to make a decision. And this is the second part.'
    );
    expect(result[0].type).toEqual(ChunkType.FinalAnswer);
  });
});
