/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Returns true if the string is a single emoji (Unicode emoji presentation or extended pictographic).
 */
export const isEmoji = (str: string): boolean =>
  /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u.test(str);

/**
 * Curated Unicode emojis for agent avatar symbol selection.
 * Categories: People & roles, Objects & tools, Symbols & abstract.
 */
export const AVATAR_EMOJIS = [
  // People & roles
  '🤖',
  '👤',
  '👥',
  '🧑‍💻',
  '🧑‍🔬',
  '🧑‍🏫',
  '🧑‍⚕️',
  '🧑‍🔧',
  '🕵️',
  '🦾',
  // Objects & tools
  '⚙️',
  '🔧',
  '🔬',
  '📡',
  '💡',
  '🖥️',
  '📊',
  '📈',
  '🗂️',
  '📋',
  '🔑',
  '🛡️',
  '🔒',
  '📦',
  '🚀',
  '✉️',
  '📣',
  '🔔',
  '📌',
  '🗺️',
  // Symbols & abstract
  '⭐',
  '🌟',
  '💫',
  '⚡',
  '🔥',
  '💎',
  '🎯',
  '🧩',
  '♾️',
  '🔮',
  '🌐',
  '🧠',
  '💬',
  '✅',
  '🚦',
  '🏷️',
  '🔗',
  '📍',
  '🎛️',
  '❓',
] as const;
