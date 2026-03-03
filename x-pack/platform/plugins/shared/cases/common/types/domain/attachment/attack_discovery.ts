/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';

/**
 * Attack Discovery Attachment Metadata
 * This metadata is stored with external reference attachments for attack discoveries
 */
export const AttackDiscoveryAttachmentMetadataRt = rt.strict({
    /**
     * The attack discovery alert ID (the ID of the alert that represents the attack discovery)
     */
    attackDiscoveryAlertId: rt.string,
    /**
     * The index where the attack discovery alert is stored
     */
    index: rt.string,
    /**
     * The generation UUID of the attack discovery run
     */
    generationUuid: rt.string,
    /**
     * The title of the attack discovery
     */
    title: rt.string,
    /**
     * The timestamp when the attack discovery was generated
     */
    timestamp: rt.string,
});

export type AttackDiscoveryAttachmentMetadata = rt.TypeOf<
    typeof AttackDiscoveryAttachmentMetadataRt
>;




