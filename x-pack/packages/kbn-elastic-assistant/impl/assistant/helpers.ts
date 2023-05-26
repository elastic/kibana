/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line import/no-nodejs-modules
import crypto from 'crypto';

import { fetchOpenAlerts, fetchVirusTotalAnalysis, sendFileToVirusTotal } from './api';
import type { Message } from '../assistant_context/types';

/**
 * Do it like this in your `kibana.dev.yml`, use 'overrides' as keys aren't actually defined
 *
 * # Security Assistant++
 * uiSettings.overrides.securityAssistant:
 *     virusTotal:
 *       apiKey: ""
 *       baseUrl: "https://www.virustotal.com/api/v3"
 *     openAI:
 *       apiKey: ""
 *       baseUrl: ""
 */
export interface AssistantUiSettings {
  openAI: {
    apiKey: string;
    baseUrl: string;
    model?: string;
    prompt?: string;
    temperature?: number;
  };

  virusTotal: {
    apiKey: string;
    baseUrl: string;
  };
}

// Here beloweth lie past functions from the original security assistant

export async function fetchVirusTotalReport({
  hash,
  settings: { virusTotal, openAI },
}: {
  hash: string;
  settings: AssistantUiSettings;
}): Promise<{
  attributes: {
    last_analysis_stats: {
      malicious: number | string;
      suspicious: number | string;
      undetected: number | string;
      timeout: number | string;
    };
    magic: string;
    meaningful_name: string;
    sha256: string;
  };
  data: {
    attributes: {
      last_analysis_stats: {
        malicious: number | string;
        suspicious: number | string;
        undetected: number | string;
        timeout: number | string;
      };
      magic: string;
      meaningful_name: string;
      sha256: string;
    };
  };
}> {
  const url = `${virusTotal.baseUrl}/files/${hash}`;

  const response = await fetch(url, {
    headers: {
      'x-apikey': virusTotal.apiKey,
    },
  });

  if (!response.ok) {
    throw new Error(`VirusTotal API request failed with status ${response.status}`);
  }

  const data = await response.json();
  return data;
}

export const isFileHash = (prompt: string): boolean => {
  return prompt.toLowerCase().startsWith('check this hash');
};

interface HandleOpenAlertsProps {
  chatHistory: Message[];
  setChatHistory: (value: Message[]) => void;
}
export const handleOpenAlerts = async ({ chatHistory, setChatHistory }: HandleOpenAlertsProps) => {
  const response = await fetchOpenAlerts();
  const dateTimeString = new Date().toLocaleString();
  try {
    if (response) {
      const formattedResponseComponent = formatOpenAlertsResponse(response);
      setChatHistory([
        ...chatHistory,
        {
          role: 'assistant',
          content: formattedResponseComponent,
          timestamp: dateTimeString,
        },
      ]);
    }
  } catch (error) {
    setChatHistory([
      ...chatHistory,
      {
        role: 'assistant',
        content: 'An error occurred while processing your request. Please try again later.',
        timestamp: dateTimeString,
      },
    ]);
  }
};

interface HandleFileHashProps {
  promptText: string;
  chatHistory: Message[];
  setChatHistory: (value: Message[]) => void;
  settings: AssistantUiSettings;
}
export const handleFileHash = async ({
  promptText,
  chatHistory,
  setChatHistory,
  settings: { virusTotal, openAI },
}: HandleFileHashProps) => {
  const hash = promptText.split(' ')[3]; // Assuming the format is "check this hash <hash>"
  const dateTimeString = new Date().toLocaleString();
  try {
    const result = await fetchVirusTotalReport({ hash, settings: { virusTotal, openAI } });
    const markdownReport = formatVirusTotalResponse(result);
    setChatHistory([
      ...chatHistory,
      { role: 'assistant', content: markdownReport, timestamp: dateTimeString },
    ]);
    // setLastResponse(markdownReport);
  } catch (error) {
    setChatHistory([
      ...chatHistory,
      {
        role: 'assistant',
        content: 'An error occurred while processing your request. Please try again later.',
        timestamp: dateTimeString,
      },
    ]);
  }
};

export const formatVirusTotalResponse = (response: {
  data: {
    attributes: {
      last_analysis_stats: {
        malicious: number | string;
        suspicious: number | string;
        undetected: number | string;
        timeout: number | string;
      };
      magic: string;
      meaningful_name: string;
      sha256: string;
    };
  };
}) => {
  const { data } = response;
  const { attributes } = data;

  const {
    last_analysis_stats: lastAnalysisStats,
    magic,
    meaningful_name: name,
    sha256,
  } = attributes;

  const mdResponse =
    `**File Name:** [${name}](https://www.virustotal.com/gui/file/${sha256});\n\n` +
    `**File Type:** ${magic}\n\n` +
    `**Scan Results:**\n\n` +
    `  - Malicious: ${lastAnalysisStats.malicious}\n` +
    `  - Suspicious: ${lastAnalysisStats.suspicious}\n` +
    `  - Undetected: ${lastAnalysisStats.undetected}\n` +
    `  - Timeout: ${lastAnalysisStats.timeout}\n\n`;

  return mdResponse;
};

export const formatOpenAlertsResponse = (
  response:
    | Array<{
        _source: {
          host?: {
            risk?: {
              calculated_level?: string | number | undefined;
            };
          };
          'kibana.alert.rule.name': string | undefined;
          'kibana.alert.reason': string | undefined;
          'kibana.alert.severity': string | number | undefined;
          user?: {
            risk?: {
              calculated_level?: string | number | undefined;
            };
          };
        };
      }>
    | undefined
): string => {
  // Check if the response object has the hits property and if it has any elements.
  if (!response || response.length === 0) {
    return 'An error occurred while formatting alerts.';
  }

  let formattedAlerts =
    'Here are the alerts which are currently open. Which one can I help you with?\n\n';
  formattedAlerts +=
    '| # | Alert Name | Severity | Event Reason | User Risk Score | Host Risk Score |\n';
  formattedAlerts += '|---|------------|----------|----------|----------|----------|\n';

  response.forEach((alert, index: number) => {
    const { _source } = alert;

    const alertName = _source['kibana.alert.rule.name'];
    const severity = _source['kibana.alert.severity'];
    const reason = _source['kibana.alert.reason'];
    const user = _source.user;
    const host = _source.host;

    const userRisk = user && user.risk ? user.risk.calculated_level : 'N/A';
    const hostRisk = host && host.risk ? host.risk.calculated_level : 'N/A';

    formattedAlerts += `| ${
      index + 1
    } | ${alertName} | ${severity} | ${reason} | ${userRisk} | ${hostRisk} |\n`;
  });
  return formattedAlerts;
};

export interface HandleFileUploadProps {
  virusTotal: AssistantUiSettings['virusTotal'];
  chatHistory: Message[];
  files: File[] | undefined;
  setChatHistory: (value: Message[]) => void;
  setFilePickerKey: React.Dispatch<React.SetStateAction<number>>;
}
export const handleFileUpload = async ({
  files,
  virusTotal,
  chatHistory,
  setChatHistory,
  setFilePickerKey,
}: HandleFileUploadProps) => {
  const dateTimeString = new Date().toLocaleString();

  if (!files || files.length === 0) {
    return;
  }

  const file = files[0];
  const fileReader = new FileReader();
  fileReader.onload = async (event) => {
    if (event.target && event.target.result) {
      const fileContent = event.target.result as ArrayBuffer;
      // const base64File = btoa(String.fromCharCode(...new Uint8Array(fileContent)));

      // Calculate the SHA-256 hash
      const hash = crypto.createHash('sha256');
      hash.update(new Uint8Array(fileContent));
      const sha256Hash = hash.digest('hex');

      // Call VirusTotal API to upload the file
      const response = await sendFileToVirusTotal({
        file,
        apiKey: virusTotal.apiKey,
        baseUrl: virusTotal.baseUrl,
      });
      if (response) {
        // Add message to chat history
        setChatHistory([
          ...chatHistory,
          {
            role: 'assistant',
            content: `The file with SHA-256 hash \`${sha256Hash}\` has been uploaded to VirusTotal. The results will be displayed once the analysis is complete.`,
            timestamp: dateTimeString,
          },
        ]);

        setFilePickerKey((prevKey) => prevKey + 1);
        const analysisId = response.data.id;

        // Poll for the analysis status
        let analysisResponse = null;
        let isAnalysisComplete = false;
        while (!isAnalysisComplete) {
          analysisResponse = await fetchVirusTotalAnalysis({
            analysisId,
            apiKey: virusTotal.apiKey,
            baseUrl: virusTotal.baseUrl,
          });

          if (analysisResponse && analysisResponse.data.attributes.status === 'completed') {
            isAnalysisComplete = true;
          } else {
            // Wait for a while before polling again
            await new Promise((resolve) => setTimeout(resolve, 5000));
          }
        }

        // Handle VirusTotal response
        const virusTotalResult = formatFileVirusTotalResponse(analysisResponse, sha256Hash);
        setChatHistory([
          ...chatHistory,
          {
            role: 'assistant',
            content: virusTotalResult,
            timestamp: dateTimeString,
          },
        ]);
        setFilePickerKey((prevKey) => prevKey + 1);
      }
    }
  };
  fileReader.readAsArrayBuffer(file);
};

export const formatFileVirusTotalResponse = (
  response: {
    data: {
      attributes: {
        results: {
          Elastic: {
            category: string;
            engine_version: string;
            result: string;
          };
        };
        stats: {
          malicious: number | string;
          suspicious: number | string;
          undetected: number | string;
          timeout: number | string;
        };
      };
    };
  },
  sha256Hash: string
) => {
  if (!response || !response.data) {
    return 'An error occurred while processing your request.';
  }

  const { data } = response;
  const { attributes } = data;
  const { results } = attributes;

  const stats = response.data.attributes.stats;
  // const links = response.data.attributes.links;
  const result =
    `**VirusTotal analysis results for \`${sha256Hash}\`**:\n\n` +
    `- Malicious: ${stats.malicious}\n` +
    `- Suspicious: ${stats.suspicious}\n` +
    `- Undetected: ${stats.undetected}\n\n` +
    `**Elastic Specific Results**\n\n` +
    `- Category: ${results.Elastic.category}\n` +
    `- Type/Signature: ${results.Elastic.result}\n` +
    `- Artifact Version: ${results.Elastic.engine_version}\n\n` +
    `**View On [VirusTotal](https://www.virustotal.com/gui/file/${sha256Hash})**`;

  return result;
};

export const getMessageFromRawResponse = (rawResponse: string): Message => {
  const dateTimeString = new Date().toLocaleString(); // TODO: Pull from response
  if (rawResponse) {
    return {
      role: 'assistant',
      content: rawResponse,
      timestamp: dateTimeString,
    };
  } else {
    return {
      role: 'assistant',
      content: 'Error: Response from LLM API is empty or undefined.',
      timestamp: dateTimeString,
    };
  }
};
