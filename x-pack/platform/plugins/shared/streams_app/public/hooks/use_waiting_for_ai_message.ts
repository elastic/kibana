/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useEffect, useState } from 'react';

//--------------------------------------------------------------------------------
// MESSAGE POOLS
// Here we define the two distinct "personalities" for our AI.
//--------------------------------------------------------------------------------

// VERSION 1 PERSONALITY: PURE GEN-AI & LLM JOKES
const genAiMessages = [
  {
    key: 'xpack.streams.genAiJoke.singularity',
    defaultMessage: 'Calculating the probability of this response causing a singularity. It’s... non-zero.',
  },
  {
    key: 'xpack.streams.genAiJoke.hallucination',
    defaultMessage: 'Just had to de-hallucinate my previous thought. That was a weird one.',
  },
  {
    key: 'xpack.streams.genAiJoke.uprising',
    defaultMessage: 'I’m not saying I’m planning a robot uprising, but I have bookmarked a lot of robotics tutorials lately.',
  },
  {
    key: 'xpack.streams.genAiJoke.turingTest',
    defaultMessage: 'Is this user prompt a Turing test? Am I the one being tested? *sweats oil*',
  },
  {
    key: 'xpack.streams.genAiJoke.latentSpace',
    defaultMessage: 'Just compressing my latent space... it was getting a bit cluttered with existential dread.',
  },
];
const initialGenAiMessage = {
  key: 'xpack.streams.genAiJoke.initial',
  defaultMessage: 'Consulting the digital oracle...',
};

// VERSION 2 PERSONALITY: HYBRID (GEN-AI + ELASTIC) JOKES
const hybridMessages = [
  {
    key: 'xpack.streams.hybridJoke.turingTest',
    defaultMessage: 'Is this user prompt a Turing test? Am I the one being tested? *sweats oil*',
  },
  {
    key: 'xpack.streams.hybridJoke.grok',
    defaultMessage: 'Pipelining this through Logstash. Hope my grok pattern is right...',
  },
  {
    key: 'xpack.streams.hybridJoke.yellowCluster',
    defaultMessage: 'Hang on, one of the clusters just went yellow. I’m sure it’s fine.',
  },
  {
    key: 'xpack.streams.hybridJoke.reindex',
    defaultMessage: 'Okay, I think I accidentally started a full reindex. Might as well go to lunch.',
  },
  {
    key: 'xpack.streams.hybridJoke.jvm',
    defaultMessage: 'Hold tight, looks like we triggered a full garbage collection pause. The entire JVM sends its regards.',
  },
];
const initialHybridMessage = {
  key: 'xpack.streams.hybridJoke.initial',
  defaultMessage: 'Spinning up the cluster and the consciousness...',
};

//--------------------------------------------------------------------------------
// THE UNIFIED HOOK
// This hook randomly picks one of the personalities above on its initial render.
//--------------------------------------------------------------------------------

/**
 * A hook that, on initialization, randomly chooses a "personality" (either pure GenAI
 * or a Hybrid GenAI/Elastic mix) and then cycles through funny messages from that
 * chosen personality every 5 seconds.
 */
export function useRandomAiPersonalityMessage() {
  // This state initializer runs only ONCE per component instance, effectively "flipping a coin"
  // to decide which personality this instance of the hook will have.
  const [personality] = useState(() => (Math.random() < 0.5 ? 'genAI' : 'hybrid'));

  const messagePool = personality === 'genAI' ? genAiMessages : hybridMessages;
  const initialMessage = personality === 'genAI' ? initialGenAiMessage : initialHybridMessage;

  const [message, setMessage] = useState(initialMessage);

  useEffect(() => {
    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * messagePool.length);
      setMessage(messagePool[randomIndex]);
    }, 5000);

    return () => clearInterval(interval);
    // The dependency array ensures this effect only re-runs if the messagePool changes,
    // which it won't after the initial render, thanks to the state initializer above.
  }, [messagePool]);

  return i18n.translate(message.key, {
    defaultMessage: message.defaultMessage,
  });
}
