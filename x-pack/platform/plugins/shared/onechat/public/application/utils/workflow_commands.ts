/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface WorkflowCommand {
  type: 'slash' | 'mention';
  workflowName: string;
  originalText: string;
  startIndex: number;
  endIndex: number;
}

/**
 * Patterns to match workflow commands
 */
const WORKFLOW_COMMAND_PATTERNS = {
  // Support both quoted multi-word names and single words
  slash: /\/workflow\s+("[^"]+"|[^\s@/]+)(?:\s+(.*))?/gi,
  mention: /@workflow\s+("[^"]+"|[^\s@/]+)(?:\s+(.*))?/gi,
};

/**
 * Parse workflow commands from input text
 */
export function parseWorkflowCommands(input: string): WorkflowCommand[] {
  const commands: WorkflowCommand[] = [];
  
  // Find slash commands
  const slashMatches = [...input.matchAll(WORKFLOW_COMMAND_PATTERNS.slash)];
  for (const match of slashMatches) {
    if (match.index !== undefined) {
      // Remove quotes from workflow name if present
      const workflowName = match[1].startsWith('"') && match[1].endsWith('"') 
        ? match[1].slice(1, -1) 
        : match[1];
      commands.push({
        type: 'slash',
        workflowName,
        originalText: match[0],
        startIndex: match.index,
        endIndex: match.index + match[0].length,
      });
    }
  }
  
  // Find mention commands
  const mentionMatches = [...input.matchAll(WORKFLOW_COMMAND_PATTERNS.mention)];
  for (const match of mentionMatches) {
    if (match.index !== undefined) {
      // Remove quotes from workflow name if present
      const workflowName = match[1].startsWith('"') && match[1].endsWith('"') 
        ? match[1].slice(1, -1) 
        : match[1];
      commands.push({
        type: 'mention',
        workflowName,
        originalText: match[0],
        startIndex: match.index,
        endIndex: match.index + match[0].length,
      });
    }
  }
  
  // Sort by position in text
  return commands.sort((a, b) => a.startIndex - b.startIndex);
}

/**
 * Transform workflow commands into natural language instructions
 */
export function transformWorkflowCommands(input: string): string {
  const commands = parseWorkflowCommands(input);
  
  if (commands.length === 0) {
    return input;
  }
  
  let transformedInput = input;
  let offset = 0;
  
  // Process commands in reverse order to maintain correct indices
  for (const command of commands.reverse()) {
    const adjustedStart = command.startIndex + offset;
    const adjustedEnd = command.endIndex + offset;
    
    // Create natural language instruction
    const instruction = createWorkflowInstruction(command);
    
    // Replace the command with the instruction
    transformedInput = 
      transformedInput.slice(0, adjustedStart) + 
      instruction + 
      transformedInput.slice(adjustedEnd);
    
    // Update offset for next replacements
    offset += instruction.length - command.originalText.length;
  }
  
  return transformedInput;
}

/**
 * Create a natural language instruction for a workflow command
 */
function createWorkflowInstruction(command: WorkflowCommand): string {
  const { workflowName, type } = command;
  
  if (type === 'slash') {
    return `Execute the workflow named "${workflowName}"`;
  } else {
    return `Please run the "${workflowName}" workflow`;
  }
}

/**
 * Check if input contains workflow commands
 */
export function hasWorkflowCommands(input: string): boolean {
  return parseWorkflowCommands(input).length > 0;
}

/**
 * Extract workflow names from commands in the input
 */
export function extractWorkflowNames(input: string): string[] {
  const commands = parseWorkflowCommands(input);
  return commands.map(cmd => cmd.workflowName);
}
