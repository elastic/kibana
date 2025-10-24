/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface ConversationArtifact {
  /* id of the artifact */
  id: string;
  /* type of the artifact */
  type: string;
  /* history of events that have affected the artifact */
  events: ArtifactEvent[];
}

interface ArtifactEventSource {
  type: 'attachment' | 'result';
  id: string;
}

interface ArtifactAddEvent {
  event_type: 'artifact_add';
  source: ArtifactEventSource;
  round_id: string;
  // TODO: reference (for attachment by ref)
  content: unknown;
}

interface ArtifactUpdateEvent {
  event_type: 'artifact_update';
  source: ArtifactEventSource;
  round_id: string;
  // TODO: reference (for attachment by ref)
  content: unknown;
}

interface ArtifactRemoveEvent {
  event_type: 'artifact_remove';
  source: ArtifactEventSource;
  round_id: string;
}

type ArtifactEvent = ArtifactAddEvent | ArtifactUpdateEvent | ArtifactRemoveEvent;
