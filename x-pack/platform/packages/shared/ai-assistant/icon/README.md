# @kbn/ai-assistant-icon

Icon components for AI assistant features in Kibana. This package provides standardized UI components for displaying AI assistant avatars, beacons, and icons across Kibana's AI-powered interfaces.

## Overview

The `@kbn/ai-assistant-icon` package contains React components for AI assistant visual elements, ensuring consistent representation of AI features throughout Kibana's user interface.

## Package Details

- **Package Type**: `shared-common`
- **Visibility**: Shared across platform
- **Dependencies**: React, Elastic UI components

## Core Components

### AssistantAvatar
Avatar component representing the AI assistant in conversations and interfaces.

### AssistantBeacon
Beacon component for drawing attention to AI assistant features.

### AssistantIcon
Standard icon component for AI assistant functionality.

## Usage Examples

```typescript
import { 
  AssistantAvatar, 
  AssistantBeacon, 
  AssistantIcon,
  useBeaconSize 
} from '@kbn/ai-assistant-icon';

// Avatar in chat interface
<AssistantAvatar size="m" />

// Beacon for feature discovery
<AssistantBeacon active={true} />

// Icon in menus and buttons
<AssistantIcon size="s" />
```

## Integration

Used across Kibana's AI-powered features to provide consistent visual representation of assistant functionality.
