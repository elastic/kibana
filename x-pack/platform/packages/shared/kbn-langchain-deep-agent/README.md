# Deep Agent

## Overview

Deep Agent is a TypeScript implementation of the Python Deep Agents library for building controllable AI agents with LangGraph. This package provides a middleware-based architecture for creating sophisticated AI agents with features like filesystem operations, subagent delegation, task management, and more.

## Features

- **Middleware-based Architecture**: Extensible agent capabilities through composable middleware
- **Filesystem Operations**: Built-in filesystem tools for reading, writing, and editing files
- **Subagent Delegation**: Delegate tasks to specialized subagents
- **Task Management**: Todo list management for tracking and completing objectives
- **Conversation Summarization**: Automatic conversation summarization to manage context length
- **Prompt Caching**: Anthropic prompt caching support for cost optimization
- **Tool Call Patching**: Advanced tool call manipulation capabilities
- **Human-in-the-Loop**: Optional human approval for critical operations
- **State Persistence**: Checkpoint and store backends for maintaining agent state

## Installation

This package is part of the Kibana platform and is available as `@kbn/langchain-deepagent`.

## Usage

### Basic Example

```typescript
import { createDeepAgent } from '@kbn/langchain-deepagent';

const agent = createDeepAgent({
  model: 'claude-sonnet-4-5-20250929',
  tools: [/* your tools */],
  systemPrompt: 'You are a helpful assistant.',
});

const response = await agent.invoke({
  messages: [{ role: 'user', content: 'Hello!' }],
});
```

### With Filesystem Middleware

```typescript
import { createDeepAgent, createFilesystemMiddleware } from '@kbn/langchain-deepagent';

const agent = createDeepAgent({
  model: 'claude-sonnet-4-5-20250929',
  middleware: [
    createFilesystemMiddleware({
      // filesystem configuration
    }),
  ],
});
```

### With Subagents

```typescript
import { createDeepAgent, createSubAgentMiddleware } from '@kbn/langchain-deepagent';

const agent = createDeepAgent({
  model: 'claude-sonnet-4-5-20250929',
  subagents: [
    {
      name: 'code-reviewer',
      description: 'Reviews code for quality and security',
      // subagent configuration
    },
  ],
});
```

## API Reference

### `createDeepAgent(params)`

Creates a Deep Agent instance with the specified configuration.

**Parameters:**
- `model` (optional): The language model to use (string or LanguageModelLike instance)
- `tools` (optional): Array of structured tools the agent can use
- `systemPrompt` (optional): Custom system prompt
- `middleware` (optional): Array of custom middleware to apply
- `subagents` (optional): Array of subagent specifications
- `responseFormat` (optional): Structured output response format
- `contextSchema` (optional): Schema for context (not persisted)
- `checkpointer` (optional): Checkpoint saver for state persistence
- `store` (optional): Store for long-term memories
- `backend` (optional): Backend for filesystem operations
- `interruptOn` (optional): Interrupt configuration mapping
- `name` (optional): Name of the agent

**Returns:** `ReactAgent` instance ready for invocation

### Middleware

- `createFilesystemMiddleware(options)`: Adds filesystem operation capabilities
- `createSubAgentMiddleware(options)`: Enables subagent delegation
- `createPatchToolCallsMiddleware(options)`: Provides tool call patching
- `createSkillsMiddleware(options)`: Adds skills-based capabilities

### Backends

- `StateBackend`: State management backend
- `StoreBackend`: Store-based backend
- `FilesystemBackend`: Filesystem operation backend
- `CompositeBackend`: Composite backend combining multiple backends

## Architecture

Deep Agent uses a middleware-based architecture where each feature is implemented as middleware that can be composed together. This allows for flexible agent configurations and easy extensibility.

The agent is built on top of LangGraph and LangChain, providing a robust foundation for building complex AI agent workflows.

## Compatibility

This TypeScript implementation maintains 1:1 compatibility with the Python Deep Agents library, ensuring consistent behavior across implementations.
