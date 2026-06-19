/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { WhyV2SpotlightIllustration } from '../../content/why_v2_features';
import ruleEventsIllustration from '../../assets/why_v2_rule_events_illustration.svg';
import dispatcherIllustration from '../../assets/why_v2_dispatcher_illustration.svg';
import { illustrationColors, whyV2IllustrationStyles } from './why_v2_illustration_styles';

interface IllustrationProps {
  'data-test-subj'?: string;
}

const IllustrationFrame = ({
  baseSrc,
  children,
  'data-test-subj': dataTestSubj,
}: IllustrationProps & {
  baseSrc: string;
  children: React.ReactNode;
}) => (
  <div css={whyV2IllustrationStyles.frame} data-test-subj={dataTestSubj}>
    <img
      src={baseSrc}
      alt=""
      aria-hidden
      css={whyV2IllustrationStyles.baseImage}
    />
    <svg
      css={[whyV2IllustrationStyles.root, whyV2IllustrationStyles.animationOverlay]}
      viewBox="0 0 280 220"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      {children}
    </svg>
  </div>
);

/** Static art from assets + animated timeline line overlay. */
const RuleEventsIllustration = ({ 'data-test-subj': dataTestSubj }: IllustrationProps) => (
  <IllustrationFrame baseSrc={ruleEventsIllustration} data-test-subj={dataTestSubj}>
    <path
      css={whyV2IllustrationStyles.timelineLine}
      d="M100 96 L116 84 L132 90 L148 72 L168 78 L184 62"
      stroke={illustrationColors.teal}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </IllustrationFrame>
);

/** Static art from assets + animated policy pulse and success badge. */
const DispatcherIllustration = ({ 'data-test-subj': dataTestSubj }: IllustrationProps) => (
  <IllustrationFrame baseSrc={dispatcherIllustration} data-test-subj={dataTestSubj}>
    <g css={whyV2IllustrationStyles.policyNode}>
      <path
        d="M166 70H126C121.582 70 118 73.5817 118 78V130C118 134.418 121.582 138 126 138H166C170.418 138 174 134.418 174 130V78C174 73.5817 170.418 70 166 70Z"
        fill="#F5F7FA"
        stroke={illustrationColors.ink}
        strokeWidth="2"
      />
      <path
        d="M162 86H130C128.895 86 128 86.8954 128 88V92C128 93.1046 128.895 94 130 94H162C163.105 94 164 93.1046 164 92V88C164 86.8954 163.105 86 162 86Z"
        fill={illustrationColors.teal}
      />
      <path
        d="M154 97H130C128.895 97 128 97.8954 128 99V101C128 102.105 128.895 103 130 103H154C155.105 103 156 102.105 156 101V99C156 97.8954 155.105 97 154 97Z"
        fill={illustrationColors.blue}
        opacity="0.7"
      />
      <path
        d="M158 106H130C128.895 106 128 106.895 128 108V110C128 111.105 128.895 112 130 112H158C159.105 112 160 111.105 160 110V108C160 106.895 159.105 106 158 106Z"
        fill={illustrationColors.pink}
        opacity="0.75"
      />
      <path
        d="M150 115H130C128.895 115 128 115.895 128 117V119C128 120.105 128.895 121 130 121H150C151.105 121 152 120.105 152 119V117C152 115.895 151.105 115 150 115Z"
        fill={illustrationColors.grey}
      />
    </g>
    <g css={whyV2IllustrationStyles.successBadge}>
      <circle cx="224" cy="104" r="22" fill={illustrationColors.teal} stroke={illustrationColors.teal} strokeWidth="2" />
      <path
        d="M223 102.944V104.944H225V102.944H223ZM218 97.9443V99.9443H220V97.9443H218ZM221 98.4443H228C229.657 98.4443 231 99.7875 231 101.444C231 103.101 229.657 104.444 228 104.444H226V104.944C226 105.497 225.552 105.944 225 105.944H223C222.448 105.944 222 105.497 222 104.944V104.444H220C218.895 104.444 218 105.34 218 106.444C218 107.549 218.895 108.444 220 108.444H229.293L227.646 106.798L228.354 106.091L231.207 108.944L228.354 111.798L227.646 111.091L229.293 109.444H220C218.343 109.444 217 108.101 217 106.444C217 104.787 218.343 103.444 220 103.444H222V102.944C222 102.392 222.448 101.944 223 101.944H225C225.552 101.944 226 102.392 226 102.944V103.444H228C229.105 103.444 230 102.549 230 101.444C230 100.34 229.105 99.4443 228 99.4443H221V99.9443C221 100.497 220.552 100.944 220 100.944H218C217.448 100.944 217 100.497 217 99.9443V97.9443C217 97.3921 217.448 96.9443 218 96.9443H220C220.552 96.9443 221 97.3921 221 97.9443V98.4443Z"
        fill="#111C2C"
      />
    </g>
  </IllustrationFrame>
);

export const WhyV2SpotlightIllustration = ({
  type,
  dataTestSubj,
}: {
  type: WhyV2SpotlightIllustration;
  dataTestSubj?: string;
}) => {
  if (type === 'dispatcher') {
    return <DispatcherIllustration data-test-subj={dataTestSubj} />;
  }
  return <RuleEventsIllustration data-test-subj={dataTestSubj} />;
};
