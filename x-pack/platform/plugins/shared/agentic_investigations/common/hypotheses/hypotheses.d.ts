/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';
export declare const hypothesisStatusSchema: z.ZodEnum<{
  confirmed: 'confirmed';
  dismissed: 'dismissed';
  investigating: 'investigating';
}>;
export type HypothesisStatus = z.infer<typeof hypothesisStatusSchema>;
/** One candidate cause and where the investigation stands on it. */
export declare const hypothesisSchema: z.ZodObject<
  {
    candidate: z.ZodString;
    confidence: z.ZodNumber;
    status: z.ZodEnum<{
      confirmed: 'confirmed';
      dismissed: 'dismissed';
      investigating: 'investigating';
    }>;
    reason: z.ZodOptional<z.ZodString>;
    evidence: z.ZodOptional<
      z.ZodArray<
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
      >
    >;
  },
  z.core.$strip
>;
export type Hypothesis = z.infer<typeof hypothesisSchema>;
export declare const hypothesesListSchema: z.ZodArray<
  z.ZodObject<
    {
      candidate: z.ZodString;
      confidence: z.ZodNumber;
      status: z.ZodEnum<{
        confirmed: 'confirmed';
        dismissed: 'dismissed';
        investigating: 'investigating';
      }>;
      reason: z.ZodOptional<z.ZodString>;
      evidence: z.ZodOptional<
        z.ZodArray<
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
        >
      >;
    },
    z.core.$strip
  >
>;
/** Stored hypotheses document: the full current list, replaced on every write. */
export declare const investigationHypothesesSchema: z.ZodObject<
  {
    id: z.ZodString;
    spaceId: z.ZodString;
    conversationId: z.ZodString;
    hypotheses: z.ZodArray<
      z.ZodObject<
        {
          candidate: z.ZodString;
          confidence: z.ZodNumber;
          status: z.ZodEnum<{
            confirmed: 'confirmed';
            dismissed: 'dismissed';
            investigating: 'investigating';
          }>;
          reason: z.ZodOptional<z.ZodString>;
          evidence: z.ZodOptional<
            z.ZodArray<
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
            >
          >;
        },
        z.core.$strip
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
export type InvestigationHypotheses = z.infer<typeof investigationHypothesesSchema>;
