import React from 'react';

import {
  KuiTitle,
  KuiText,
  KuiVerticalRhythm,
} from '../../../../components';

export default () => (
  <div>
    <KuiVerticalRhythm size="xLarge">
      <KuiTitle size="large">
        <h1>This is the title of the page -- descriptive enough for ya?</h1>
      </KuiTitle>
    </KuiVerticalRhythm>

    <KuiVerticalRhythm size="large">
      <KuiTitle>
        <h2>And this is a section within the page</h2>
      </KuiTitle>
    </KuiVerticalRhythm>

    <KuiVerticalRhythm>
      <KuiTitle size="small">
        <h3>A brief note on lazy dogs and quick foxes</h3>
      </KuiTitle>
    </KuiVerticalRhythm>

    <KuiVerticalRhythm>
      <KuiText>
        <p>
          Once upon a time in a land far, far away, a quick brown fox jumped over a lazy dog.
        </p>
      </KuiText>
    </KuiVerticalRhythm>

    <KuiVerticalRhythm>
      <KuiText>
        <p>
          But the dog wasn&rsquo;t lazy, it was just
          practicing mindfulness, so it had a greater sense of
          life-satisfaction than that fox with all its silly jumping.
        </p>
      </KuiText>
    </KuiVerticalRhythm>

    <KuiVerticalRhythm size="small">
      <KuiText size="small">
        <p>
          And from the fox&rsquo;s perspective, life was full of hoops to jump <em>through</em>, low-hanging
          fruit to jump <em>for</em>, and dead car batteries to jump-<em>start</em>.
        </p>
      </KuiText>
    </KuiVerticalRhythm>

    <KuiVerticalRhythm size="small">
      <KuiText size="small">
        <p>
          So it thought the dog was making a poor life choice by focusing so much on mindfulness.
          What if its car broke down?
        </p>
      </KuiText>
    </KuiVerticalRhythm>
  </div>
);
