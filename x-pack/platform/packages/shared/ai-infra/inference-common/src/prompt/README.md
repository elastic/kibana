# Prompt API: Interacting with LLMs through Structured Prompts

This document explains how to use the Prompt API (located in `api.ts`) to communicate effectively with Large Language Models (LLMs). Instead of sending plain text, this API allows you to define structured `Prompt` objects, enabling more predictable and controllable interactions with the AI.

## Core Goal: Getting Tailored AI Responses

The primary purpose of this API is to help you:

1.  **Define a clear task or question** for the LLM using a `Prompt` template.
2.  **Provide specific input data** that fills in the details of your template.
3.  **Receive a response from the LLM** that is shaped by your structured prompt, potentially including structured data or tool usage.

## How it Works: The `PromptAPI`

The main way to use this system is through the `PromptAPI` function. Think of it as your gateway to the LLM.

**What it does:**
You provide the `PromptAPI` with:

- A `prompt` object: This is your pre-defined template that tells the LLM what kind of information you want and in what format.
- An `input` object: This is the specific data that gets plugged into your `prompt` template for a particular request.
- Optional configurations (`PromptOptions`): These allow you to fine-tune the LLM's behavior and how you receive the response.

**What you get back (`PromptCompositeResponse`):**
The API is flexible in how it returns data:

- **For quick, complete answers**: If you're not streaming (i.e., `stream` option is `false` or not set), you'll get a `Promise` that resolves with the full `PromptResponse` once the LLM has finished processing. This is useful when you need the entire output before proceeding.
- **For real-time updates**: If you enable streaming (i.e., `stream` option is `true`), you'll get a `PromptStreamResponse` (typically an Observable). This allows you to process parts of the LLM's response as they arrive, which is great for user interfaces or long-running tasks where immediate feedback is important.

## Configuring Your Interaction: `PromptOptions`

When you call `PromptAPI`, you can customize the interaction using `PromptOptions`. Here’s why you’d use some key options:

- `prompt: TPrompt`: **Essential.** This is your structured instruction set for the LLM. It defines the task, the expected output format, and any tools the LLM might use.
- `input: z.input<TPrompt['input']>`: **Essential.** This is the runtime data that makes your generic `prompt` specific to a single request. For example, if your prompt is "Summarize this text: {{article}}", your input would provide the actual `article` content.
- `stream?: boolean`:
  - Set to `true` if you want to receive the LLM's response piece by piece (e.g., for a chatbot typing effect).
  - Leave as `false` (or omit) if you prefer to wait for the entire response at once.
- `prevMessages?: Message[]`: Use this to provide conversational context. If your current prompt is part of an ongoing dialogue, `prevMessages` helps the LLM understand the history and generate a more relevant response.
- Other options (like `temperature`, `max_tokens` inherited from `ChatCompleteOptions`): These allow finer control over the LLM's creativity, response length, etc.

## Understanding the Output

### `PromptResponse` (Non-Streaming)

When you're not streaming, you'll work with a `PromptResponse`. This object contains the complete answer from the LLM, including any structured data or tool calls that your `Prompt` was designed to elicit.

### `PromptStreamResponse` (Streaming)

When streaming, you'll get a `PromptStreamResponse`. This is typically an Observable that emits data chunks as the LLM generates them. You'll subscribe to this stream to handle the incoming pieces of the response, allowing for a more dynamic interaction.

Both response types are specialized with `ToolOptionsOfPrompt<TPrompt>`, indicating that the structure of the response (especially regarding tool usage) is tied to the specific `Prompt` you used.
