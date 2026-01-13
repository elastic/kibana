# @kbn/ai-agent-confirmation-modal

A shared React component package that provides a confirmation modal for switching to AI Agent mode.

## Usage

```typescript
import { AIAgentConfirmationModal } from '@kbn/ai-agent-confirmation-modal';

<AIAgentConfirmationModal
  onConfirm={() => console.log('Confirmed')}
  onCancel={() => console.log('Cancelled')}
/>
```

## Why a Shared Package?

This modal is used across multiple Kibana plugins:
- AI Assistant Management Selection Plugin
- GenAI Settings Plugin
- Observability AI Assistant App
- Security Elastic Assistant