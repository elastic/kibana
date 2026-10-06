/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';
/**
 * One affected entity. `id` is the stable key both solutions filter on.
 * AlertZero sends an Entity Store id and may omit `name` until hydration.
 * Nightshift sends the service name plus, when it has them, type, Knowledge
 * Indicator id, stream, and evidence of how this entity was affected.
 */
export declare const impactEntitySchema: z.ZodObject<
  {
    id: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    type: z.ZodOptional<z.ZodString>;
    featureId: z.ZodOptional<z.ZodString>;
    streamName: z.ZodOptional<z.ZodString>;
    evidence: z.ZodOptional<
      z.ZodObject<
        {
          description: z.ZodOptional<z.ZodString>;
          chart: z.ZodOptional<
            z.ZodObject<
              {
                type: z.ZodEnum<{
                  bar: 'bar';
                  line: 'line';
                }>;
                title: z.ZodString;
                x_axis: z.ZodObject<
                  {
                    type: z.ZodEnum<{
                      category: 'category';
                      time: 'time';
                    }>;
                    label: z.ZodOptional<z.ZodString>;
                  },
                  z.core.$strip
                >;
                y_axis: z.ZodObject<
                  {
                    label: z.ZodOptional<z.ZodString>;
                    unit: z.ZodOptional<
                      z.ZodEnum<{
                        bytes: 'bytes';
                        ms: 'ms';
                        number: 'number';
                        percent: 'percent';
                        s: 's';
                      }>
                    >;
                  },
                  z.core.$strip
                >;
                stacked: z.ZodOptional<z.ZodBoolean>;
                series: z.ZodArray<
                  z.ZodObject<
                    {
                      name: z.ZodString;
                      points: z.ZodArray<
                        z.ZodObject<
                          {
                            x: z.ZodString;
                            y: z.ZodNumber;
                          },
                          z.core.$strip
                        >
                      >;
                    },
                    z.core.$strip
                  >
                >;
                annotations: z.ZodOptional<
                  z.ZodArray<
                    z.ZodObject<
                      {
                        x: z.ZodString;
                        x_end: z.ZodOptional<z.ZodString>;
                        label: z.ZodString;
                      },
                      z.core.$strip
                    >
                  >
                >;
              },
              z.core.$strip
            >
          >;
        },
        z.core.$strip
      >
    >;
  },
  z.core.$strip
>;
export type ImpactEntity = z.infer<typeof impactEntitySchema>;
/** Entities a write sends: at least one, so an attach always adds something. */
export declare const impactEntitiesSchema: z.ZodArray<
  z.ZodObject<
    {
      id: z.ZodString;
      name: z.ZodOptional<z.ZodString>;
      type: z.ZodOptional<z.ZodString>;
      featureId: z.ZodOptional<z.ZodString>;
      streamName: z.ZodOptional<z.ZodString>;
      evidence: z.ZodOptional<
        z.ZodObject<
          {
            description: z.ZodOptional<z.ZodString>;
            chart: z.ZodOptional<
              z.ZodObject<
                {
                  type: z.ZodEnum<{
                    bar: 'bar';
                    line: 'line';
                  }>;
                  title: z.ZodString;
                  x_axis: z.ZodObject<
                    {
                      type: z.ZodEnum<{
                        category: 'category';
                        time: 'time';
                      }>;
                      label: z.ZodOptional<z.ZodString>;
                    },
                    z.core.$strip
                  >;
                  y_axis: z.ZodObject<
                    {
                      label: z.ZodOptional<z.ZodString>;
                      unit: z.ZodOptional<
                        z.ZodEnum<{
                          bytes: 'bytes';
                          ms: 'ms';
                          number: 'number';
                          percent: 'percent';
                          s: 's';
                        }>
                      >;
                    },
                    z.core.$strip
                  >;
                  stacked: z.ZodOptional<z.ZodBoolean>;
                  series: z.ZodArray<
                    z.ZodObject<
                      {
                        name: z.ZodString;
                        points: z.ZodArray<
                          z.ZodObject<
                            {
                              x: z.ZodString;
                              y: z.ZodNumber;
                            },
                            z.core.$strip
                          >
                        >;
                      },
                      z.core.$strip
                    >
                  >;
                  annotations: z.ZodOptional<
                    z.ZodArray<
                      z.ZodObject<
                        {
                          x: z.ZodString;
                          x_end: z.ZodOptional<z.ZodString>;
                          label: z.ZodString;
                        },
                        z.core.$strip
                      >
                    >
                  >;
                },
                z.core.$strip
              >
            >;
          },
          z.core.$strip
        >
      >;
    },
    z.core.$strip
  >
>;
/**
 * Entities a stored document holds. May be empty or absent: an agent can describe impact with
 * only a summary and evidence, and documents written before that still carry entities.
 */
export declare const storedImpactEntitiesSchema: z.ZodArray<
  z.ZodObject<
    {
      id: z.ZodString;
      name: z.ZodOptional<z.ZodString>;
      type: z.ZodOptional<z.ZodString>;
      featureId: z.ZodOptional<z.ZodString>;
      streamName: z.ZodOptional<z.ZodString>;
      evidence: z.ZodOptional<
        z.ZodObject<
          {
            description: z.ZodOptional<z.ZodString>;
            chart: z.ZodOptional<
              z.ZodObject<
                {
                  type: z.ZodEnum<{
                    bar: 'bar';
                    line: 'line';
                  }>;
                  title: z.ZodString;
                  x_axis: z.ZodObject<
                    {
                      type: z.ZodEnum<{
                        category: 'category';
                        time: 'time';
                      }>;
                      label: z.ZodOptional<z.ZodString>;
                    },
                    z.core.$strip
                  >;
                  y_axis: z.ZodObject<
                    {
                      label: z.ZodOptional<z.ZodString>;
                      unit: z.ZodOptional<
                        z.ZodEnum<{
                          bytes: 'bytes';
                          ms: 'ms';
                          number: 'number';
                          percent: 'percent';
                          s: 's';
                        }>
                      >;
                    },
                    z.core.$strip
                  >;
                  stacked: z.ZodOptional<z.ZodBoolean>;
                  series: z.ZodArray<
                    z.ZodObject<
                      {
                        name: z.ZodString;
                        points: z.ZodArray<
                          z.ZodObject<
                            {
                              x: z.ZodString;
                              y: z.ZodNumber;
                            },
                            z.core.$strip
                          >
                        >;
                      },
                      z.core.$strip
                    >
                  >;
                  annotations: z.ZodOptional<
                    z.ZodArray<
                      z.ZodObject<
                        {
                          x: z.ZodString;
                          x_end: z.ZodOptional<z.ZodString>;
                          label: z.ZodString;
                        },
                        z.core.$strip
                      >
                    >
                  >;
                },
                z.core.$strip
              >
            >;
          },
          z.core.$strip
        >
      >;
    },
    z.core.$strip
  >
>;
/**
 * Stored impact document. Validates both documents written before summary and evidence existed
 * (entities only) and those an agent writes (summary, evidence, entities in any combination).
 */
export declare const impactSchema: z.ZodObject<
  {
    id: z.ZodString;
    spaceId: z.ZodString;
    conversationId: z.ZodString;
    summary: z.ZodOptional<z.ZodString>;
    evidence: z.ZodOptional<
      z.ZodObject<
        {
          description: z.ZodOptional<z.ZodString>;
          chart: z.ZodOptional<
            z.ZodObject<
              {
                type: z.ZodEnum<{
                  bar: 'bar';
                  line: 'line';
                }>;
                title: z.ZodString;
                x_axis: z.ZodObject<
                  {
                    type: z.ZodEnum<{
                      category: 'category';
                      time: 'time';
                    }>;
                    label: z.ZodOptional<z.ZodString>;
                  },
                  z.core.$strip
                >;
                y_axis: z.ZodObject<
                  {
                    label: z.ZodOptional<z.ZodString>;
                    unit: z.ZodOptional<
                      z.ZodEnum<{
                        bytes: 'bytes';
                        ms: 'ms';
                        number: 'number';
                        percent: 'percent';
                        s: 's';
                      }>
                    >;
                  },
                  z.core.$strip
                >;
                stacked: z.ZodOptional<z.ZodBoolean>;
                series: z.ZodArray<
                  z.ZodObject<
                    {
                      name: z.ZodString;
                      points: z.ZodArray<
                        z.ZodObject<
                          {
                            x: z.ZodString;
                            y: z.ZodNumber;
                          },
                          z.core.$strip
                        >
                      >;
                    },
                    z.core.$strip
                  >
                >;
                annotations: z.ZodOptional<
                  z.ZodArray<
                    z.ZodObject<
                      {
                        x: z.ZodString;
                        x_end: z.ZodOptional<z.ZodString>;
                        label: z.ZodString;
                      },
                      z.core.$strip
                    >
                  >
                >;
              },
              z.core.$strip
            >
          >;
        },
        z.core.$strip
      >
    >;
    entities: z.ZodOptional<
      z.ZodArray<
        z.ZodObject<
          {
            id: z.ZodString;
            name: z.ZodOptional<z.ZodString>;
            type: z.ZodOptional<z.ZodString>;
            featureId: z.ZodOptional<z.ZodString>;
            streamName: z.ZodOptional<z.ZodString>;
            evidence: z.ZodOptional<
              z.ZodObject<
                {
                  description: z.ZodOptional<z.ZodString>;
                  chart: z.ZodOptional<
                    z.ZodObject<
                      {
                        type: z.ZodEnum<{
                          bar: 'bar';
                          line: 'line';
                        }>;
                        title: z.ZodString;
                        x_axis: z.ZodObject<
                          {
                            type: z.ZodEnum<{
                              category: 'category';
                              time: 'time';
                            }>;
                            label: z.ZodOptional<z.ZodString>;
                          },
                          z.core.$strip
                        >;
                        y_axis: z.ZodObject<
                          {
                            label: z.ZodOptional<z.ZodString>;
                            unit: z.ZodOptional<
                              z.ZodEnum<{
                                bytes: 'bytes';
                                ms: 'ms';
                                number: 'number';
                                percent: 'percent';
                                s: 's';
                              }>
                            >;
                          },
                          z.core.$strip
                        >;
                        stacked: z.ZodOptional<z.ZodBoolean>;
                        series: z.ZodArray<
                          z.ZodObject<
                            {
                              name: z.ZodString;
                              points: z.ZodArray<
                                z.ZodObject<
                                  {
                                    x: z.ZodString;
                                    y: z.ZodNumber;
                                  },
                                  z.core.$strip
                                >
                              >;
                            },
                            z.core.$strip
                          >
                        >;
                        annotations: z.ZodOptional<
                          z.ZodArray<
                            z.ZodObject<
                              {
                                x: z.ZodString;
                                x_end: z.ZodOptional<z.ZodString>;
                                label: z.ZodString;
                              },
                              z.core.$strip
                            >
                          >
                        >;
                      },
                      z.core.$strip
                    >
                  >;
                },
                z.core.$strip
              >
            >;
          },
          z.core.$strip
        >
      >
    >;
    createdAt: z.ZodString;
    createdBy: z.ZodOptional<
      z.ZodObject<
        {
          username: z.ZodNullable<z.ZodString>;
          fullName: z.ZodNullable<z.ZodString>;
          email: z.ZodNullable<z.ZodString>;
          profileUid: z.ZodOptional<z.ZodString>;
        },
        z.core.$strip
      >
    >;
    updatedAt: z.ZodOptional<z.ZodString>;
  },
  z.core.$strip
>;
export type Impact = z.infer<typeof impactSchema>;
export declare const attachImpactRequestSchema: z.ZodObject<
  {
    conversationId: z.ZodString;
    entities: z.ZodArray<
      z.ZodObject<
        {
          id: z.ZodString;
          name: z.ZodOptional<z.ZodString>;
          type: z.ZodOptional<z.ZodString>;
          featureId: z.ZodOptional<z.ZodString>;
          streamName: z.ZodOptional<z.ZodString>;
          evidence: z.ZodOptional<
            z.ZodObject<
              {
                description: z.ZodOptional<z.ZodString>;
                chart: z.ZodOptional<
                  z.ZodObject<
                    {
                      type: z.ZodEnum<{
                        bar: 'bar';
                        line: 'line';
                      }>;
                      title: z.ZodString;
                      x_axis: z.ZodObject<
                        {
                          type: z.ZodEnum<{
                            category: 'category';
                            time: 'time';
                          }>;
                          label: z.ZodOptional<z.ZodString>;
                        },
                        z.core.$strip
                      >;
                      y_axis: z.ZodObject<
                        {
                          label: z.ZodOptional<z.ZodString>;
                          unit: z.ZodOptional<
                            z.ZodEnum<{
                              bytes: 'bytes';
                              ms: 'ms';
                              number: 'number';
                              percent: 'percent';
                              s: 's';
                            }>
                          >;
                        },
                        z.core.$strip
                      >;
                      stacked: z.ZodOptional<z.ZodBoolean>;
                      series: z.ZodArray<
                        z.ZodObject<
                          {
                            name: z.ZodString;
                            points: z.ZodArray<
                              z.ZodObject<
                                {
                                  x: z.ZodString;
                                  y: z.ZodNumber;
                                },
                                z.core.$strip
                              >
                            >;
                          },
                          z.core.$strip
                        >
                      >;
                      annotations: z.ZodOptional<
                        z.ZodArray<
                          z.ZodObject<
                            {
                              x: z.ZodString;
                              x_end: z.ZodOptional<z.ZodString>;
                              label: z.ZodString;
                            },
                            z.core.$strip
                          >
                        >
                      >;
                    },
                    z.core.$strip
                  >
                >;
              },
              z.core.$strip
            >
          >;
        },
        z.core.$strip
      >
    >;
  },
  z.core.$strip
>;
export type AttachImpactRequest = z.infer<typeof attachImpactRequestSchema>;
export declare const getImpactQuerySchema: z.ZodObject<
  {
    conversationId: z.ZodString;
  },
  z.core.$strip
>;
export type GetImpactQuery = z.infer<typeof getImpactQuerySchema>;
