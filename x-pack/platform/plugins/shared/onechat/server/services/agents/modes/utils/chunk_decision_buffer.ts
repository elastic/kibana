/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Defines the types of content chunks the buffer can classify.
 */
export enum ChunkType {
  FinalAnswer = 'final_answer',
  ToolReasoning = 'tool_reasoning',
}

/**
 * The structured output for a processed chunk.
 */
export interface ClassifiedChunk {
  type: ChunkType;
  text: string;
}

/**
 * A utility to buffer and conditionally classify text chunks from an LLM stream.
 */
export class ChunkDecisionBuffer {
  private readonly openingTag: string;
  private readonly closingTag: string;
  private readonly decisionThreshold: number;

  private decisionMade = false;
  private isToolTurn = false;
  private buffer: string[] = [];
  private accumulatedText = '';

  private trailingCleanBuffer = '';

  constructor({ tag }: { tag: string }) {
    if (!tag.startsWith('<') || !tag.endsWith('>')) {
      throw new Error('Tag must be a valid XML-like tag, e.g., "<example>"');
    }
    this.openingTag = tag;
    this.closingTag = `</${tag.substring(1)}`;
    this.decisionThreshold = this.openingTag.length;
  }

  public reset(): void {
    this.decisionMade = false;
    this.isToolTurn = false;
    this.buffer = [];
    this.accumulatedText = '';
    this.trailingCleanBuffer = '';
  }

  public process(chunkText: string): ClassifiedChunk[] | null {
    if (this.decisionMade) {
      const type = this.isToolTurn ? ChunkType.ToolReasoning : ChunkType.FinalAnswer;
      const cleanedText = this.cleanAndManageBuffer(chunkText);
      return cleanedText ? [{ type, text: cleanedText }] : null;
    }

    this.buffer.push(chunkText);
    this.accumulatedText += chunkText;

    if (this.accumulatedText.trimStart().startsWith(this.openingTag)) {
      this.decisionMade = true;
      this.isToolTurn = true;
      return this.flushAndClassifyBuffer(ChunkType.ToolReasoning);
    }

    if (this.accumulatedText.length >= this.decisionThreshold) {
      this.decisionMade = true;
      this.isToolTurn = false;
      return this.flushAndClassifyBuffer(ChunkType.FinalAnswer);
    }

    return null;
  }

  public flush(): ClassifiedChunk[] | null {
    if (!this.decisionMade && this.buffer.length > 0) {
      const fullText = this.buffer.join('');
      this.buffer = [];
      if (fullText) {
        return [{ type: ChunkType.FinalAnswer, text: fullText }];
      }
      return null;
    }

    let remainingText = this.trailingCleanBuffer;
    this.trailingCleanBuffer = '';

    if (remainingText) {
      // At the very end of the stream, we must clean up any partial tags.
      const lastTagStart = remainingText.lastIndexOf('<');
      if (lastTagStart !== -1) {
        const potentialFragment = remainingText.substring(lastTagStart);
        if (
          this.openingTag.startsWith(potentialFragment) ||
          this.closingTag.startsWith(potentialFragment)
        ) {
          // It is a partial tag, so we trim it off before flushing.
          remainingText = remainingText.substring(0, lastTagStart);
        }
      }

      if (remainingText) {
        const type = this.isToolTurn ? ChunkType.ToolReasoning : ChunkType.FinalAnswer;
        return [{ type, text: remainingText }];
      }
    }

    return null;
  }

  private flushAndClassifyBuffer(type: ChunkType): ClassifiedChunk[] {
    const combinedText = this.buffer.join('');
    this.buffer = [];
    const cleanedText = this.cleanAndManageBuffer(combinedText);
    return cleanedText ? [{ type, text: cleanedText }] : [];
  }

  /**
   * A stream-safe method to clean tags from text using pattern matching.
   * This is more robust than the previous length-based heuristic.
   */
  private cleanAndManageBuffer(newText: string): string {
    let textToProcess = this.trailingCleanBuffer + newText;

    // Replace any complete tags within the current working text
    textToProcess = textToProcess.replace(this.openingTag, '').replace(this.closingTag, '');

    // Now, decide what part of textToProcess is safe to emit.
    let safeToEmit = textToProcess;

    // Find the last potential start of a tag ('<')
    const lastTagStart = textToProcess.lastIndexOf('<');

    if (lastTagStart !== -1) {
      const potentialFragment = textToProcess.substring(lastTagStart);
      // Check if this fragment could be the start of either of our tags
      if (
        this.openingTag.startsWith(potentialFragment) ||
        this.closingTag.startsWith(potentialFragment)
      ) {
        // It's a potential partial tag. Hold it back for the next chunk.
        safeToEmit = textToProcess.substring(0, lastTagStart);
        this.trailingCleanBuffer = potentialFragment;
      } else {
        // It's a '<' but not part of our tags, so clear the trailing buffer
        this.trailingCleanBuffer = '';
      }
    } else {
      this.trailingCleanBuffer = '';
    }

    return safeToEmit;
  }
}
