import React from 'react';

import {
  KuiTitle,
  KuiText,
} from '../../../../components';

export default () => (
  <div>
    <KuiTitle size="large" verticalRhythm>
      <h1>This is the title of the page -- descriptive enough for ya?</h1>
    </KuiTitle>

    <KuiTitle verticalRhythm>
      <h2>And this is a section within the page</h2>
    </KuiTitle>

    <KuiTitle size="small" verticalRhythm>
      <h3>A brief note on lazy dogs and quick foxes</h3>
    </KuiTitle>

    <KuiText verticalRhythm>
      <p>
        Once upon a time in a land far, far away, a quick brown fox jumped over a lazy dog.
      </p>
    </KuiText>

    <KuiText verticalRhythm>
      <p>
        But the dog wasn&rsquo;t lazy, it was just
        practicing mindfulness, so it had a greater sense of
        life-satisfaction than that fox with all its silly jumping.
      </p>
    </KuiText>

    <KuiText size="small" verticalRhythm>
      <p>
        And from the fox&rsquo;s perspective, life was full of hoops to jump <em>through</em>, low-hanging
        fruit to jump <em>for</em>, and dead car batteries to jump-<em>start</em>.
      </p>
    </KuiText>

    <KuiText size="small" verticalRhythm>
      <p>
        So it thought the dog was making a poor life choice by focusing so much on mindfulness.
        What if its car broke down?
      </p>
    </KuiText>
  </div>
);
