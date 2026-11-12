# Dreaming eval: dreaming-eval-longmemeval, run dev50-batched

Whether the 1619 KIs hold each target, judged by `.anthropic-claude-4.6-sonnet-chat_completion` on the KIs ranked highest by the .rerank-v1-elasticsearch reranker. Covered counts 1 and partial 0.5.

## Overall

| | Targets | Covered | Partial | Missing | Error | Score |
| --- | --- | --- | --- | --- | --- | --- |
| all | 50 | 23 | 10 | 17 | 0 | 56.0% |

## By dataset

| | Targets | Covered | Partial | Missing | Error | Score |
| --- | --- | --- | --- | --- | --- | --- |
| longmemeval_s | 50 | 23 | 10 | 17 | 0 | 56.0% |

## By category

| | Targets | Covered | Partial | Missing | Error | Score |
| --- | --- | --- | --- | --- | --- | --- |
| knowledge-update | 8 | 4 | 0 | 4 | 0 | 50.0% |
| multi-session | 13 | 7 | 3 | 3 | 0 | 65.4% |
| single-session-assistant | 6 | 0 | 0 | 6 | 0 | 0.0% |
| single-session-preference | 3 | 0 | 1 | 2 | 0 | 16.7% |
| single-session-user | 7 | 5 | 1 | 1 | 0 | 78.6% |
| temporal-reasoning | 13 | 7 | 5 | 1 | 0 | 73.1% |

## Not covered

- **missing** `0a995998` (multi-session): How many items of clothing do I need to pick up or return from a store? → 3. No stored items mention picking up or returning multiple items of clothing from a store; only a single boot exchange at Zara is noted.
- **missing** `6aeb4375` (knowledge-update): How many Korean restaurants have I tried in my city? → four. None of the stored items mention Korean restaurants visited by the user in their city.
- **partial** `6d550036` (multi-session): How many projects have I led or am currently leading? → 2. The stored items show the user leading a team as senior software engineer and leading a Marketing Research class project, plus a solo Data Mining project, but it's unclear which two projects the expected answer of '2' refers to, and the items don't explicitly state a total count of projects led.
- **missing** `7161e7e2` (single-session-assistant): I'm checking our previous chat about the shift rotation sheet for GM social media agents. Can you remind me what was the rotation for Admon on a Sunday? → Admon was assigned to the 8 am - 4 pm (Day Shift) on Sundays.. None of the stored items contain any information about a shift rotation sheet for GM social media agents or Admon's Sunday schedule.
- **partial** `8a2466db` (single-session-preference): Can you recommend some resources where I can learn more about video editing? → The user would prefer responses that suggest resources specifically tailored to Adobe Premiere Pro, especially those tha. The stored items confirm the user enjoys Adobe Premiere Pro, which implies a preference for resources about it, but there is no stored information about their preference for advanced settings specifically or their disinterest in general/other software resources.
- **partial** `gpt4_f49edff3` (temporal-reasoning): Which three events happened in the order from first to last: the day I helped my friend prepare the nursery, the day I helped my cousin pick out stuff for her b → First, I helped my friend prepare the nursery, then I helped my cousin pick out stuff for her baby shower, and lastly, I. Only the first event (helping friend prepare nursery on February 5, 2023) is stored; the dates for helping cousin pick out baby shower items and ordering a customized phone case are not recorded.
- **missing** `07b6f563` (single-session-preference): Can you suggest some useful accessories for my phone? → The user would prefer suggestions of accessories that are compatible with an iPhone 13 Pro, such as high-quality screen . None of the stored items mention the user owning an iPhone 13 Pro or any Apple device, which is the key information needed to suggest compatible phone accessories.
- **missing** `0ea62687` (multi-session): How much more miles per gallon was my car getting a few months ago compared to now? → 2. None of the stored items contain any information about the user's car fuel efficiency or miles per gallon figures.
- **partial** `311778f1` (single-session-user): How many hours did I spend watching documentaries on Netflix last month? → 10. The stored item mentions 10 hours of Netflix documentary watching but specifies April 2023, while the question asked on 2023-05-30 refers to 'last month' which would be April 2023 — so the data matches, but the item doesn't explicitly frame it as 'last month' from the question's perspective, making it a close but indirect match; however, the 10-hour figure is present and the month aligns.
- **missing** `4fd1909e` (single-session-user): Where did I attend the Imagine Dragons concert? → Xfinity Center. None of the stored items mention an Imagine Dragons concert or the Xfinity Center.
- **missing** `51b23612` (single-session-assistant): I was going through our previous conversation about political propaganda and humor, and I was wondering if you could remind me of that Soviet cartoon you mentio → Nu, pogodi!. None of the stored items contain any information about Soviet cartoons, political propaganda, humor, or 'Nu, pogodi!'.
- **missing** `618f13b2` (knowledge-update): How many times have I worn my new black Converse Chuck Taylor All Star sneakers? → six. None of the stored items contain any information about black Converse Chuck Taylor All Star sneakers or how many times the user has worn them.
- **missing** `65240037` (single-session-assistant): I remember you told me to dilute tea tree oil with a carrier oil before applying it to my skin. Can you remind me what the recommended ratio is? → The recommended ratio is 1:10, meaning one part tea tree oil to ten parts carrier oil.. None of the stored items contain any information about tea tree oil dilution ratios or skincare advice related to carrier oils.
- **missing** `69fee5aa` (knowledge-update): How many pre-1920 American coins do I have in my collection? → 38. No stored item mentions the specific count of 38 pre-1920 American coins in the user's collection.
- **partial** `71017277` (temporal-reasoning): I received a piece of jewelry last Saturday from whom? → my aunt. The stored fact mentions receiving an antique crystal chandelier from the user's aunt on March 4, 2023 (a Saturday), but the question asks about 'jewelry' — a chandelier is not jewelry, so while the giver (aunt) and date match, the item type does not align with the question.
- **missing** `9bbe84a2` (knowledge-update): What was my previous goal for my Apex Legends level before I updated my goal? → level 100. None of the stored items contain any information about Apex Legends or the user's level goals in that game.
- **missing** `a40e080f` (single-session-assistant): I was going through our previous conversation and I was wondering if you could remind me of the two companies you mentioned that prioritize employee safety and  → Patagonia and Southwest Airlines.. None of the stored items mention Triumvirate, Patagonia, or Southwest Airlines, or any discussion about companies prioritizing employee safety and well-being.
- **partial** `aae3761f` (multi-session): How many hours in total did I spend driving to my three road trip destinations combined? → 15 hours for getting to the three destinations (or 30 hours for the round trip). The three driving durations (6 hours to D.C., 4 hours to Outer Banks, 5 hours to Tennessee) are stored and sum to 15 hours, but the items don't explicitly identify these as 'three road trip destinations' in a unified context, requiring inference across separate facts.
- **partial** `b29f3365` (temporal-reasoning): How long had I been taking guitar lessons when I bought the new guitar amp? → Four weeks. The amp was purchased around May 11, 2023, and lessons had been ongoing for six weeks as of May 25, 2023, which allows working out approximately four weeks of lessons at the time of purchase, but the stored facts don't explicitly state the lesson start date or duration at time of purchase with enough precision to confirm exactly four weeks.
- **missing** `ceb54acb` (single-session-assistant): In our previous chat, you suggested 'sexual compulsions' and a few other options for alternative terms for certain behaviors. Can you remind me what the other f → I suggested 'sexual fixations', 'problematic sexual behaviors', 'sexual impulsivity', and 'compulsive sexuality'.. None of the stored items contain any information about alternative terms for sexual behaviors or the specific terms mentioned in the expected answer.
- **missing** `d24813b1` (single-session-preference): I'm thinking of inviting my colleagues over for a small gathering. Any tips on what to bake? → The user would prefer baking suggestions that take into account their previous success with the lemon poppyseed cake, su. None of the stored items contain any information about the user's baking experience, specifically their previous success with a lemon poppyseed cake or any baking preferences.
- **missing** `d905b33f` (multi-session): What percentage discount did I get on the book from my favorite author? → 20%. None of the stored items contain any information about a book purchase, a favorite author, or a discount percentage.
- **missing** `e9327a54` (single-session-assistant): I'm planning to revisit Orlando. I was wondering if you could remind me of that unique dessert shop with the giant milkshakes we talked about last time? → The Sugar Factory at Icon Park.. None of the stored items mention Orlando, the Sugar Factory, Icon Park, or giant milkshakes.
- **partial** `ef9cf60a` (multi-session): How much did I spend on gifts for my sister? → $300. The two items together account for $200 (Tiffany necklace) + $100 (spa gift card) = $300, but the question asks about spending on gifts for the sister without specifying a time frame, and it's unclear if both gifts are being referenced together as the basis for the $300 answer, since the spa gift card is described as a past gift and the necklace as a May 2023 purchase.
- **partial** `gpt4_2c50253f` (temporal-reasoning): What time do I wake up on Tuesdays and Thursdays? → 6:45 AM. The two facts together allow the answer to be calculated: the user wakes up at 7:00 AM normally but 15 minutes earlier on Tuesdays and Thursdays, yielding 6:45 AM, though neither fact states 6:45 AM explicitly.
- **missing** `gpt4_68e94287` (temporal-reasoning): Which event happened first, my participation in the #PlankChallenge or my post about vegan chili recipe? → You posted a recipe for vegan chili on Instagram using the hashtag #FoodieAdventures first.. None of the stored items contain any information about the user's participation in a #PlankChallenge or posting a vegan chili recipe on Instagram with #FoodieAdventures.
- **partial** `gpt4_f420262c` (temporal-reasoning): What is the order of airlines I flew with from earliest to latest before today? → JetBlue, Delta, United, American Airlines. Delta (Jan 15), United (Jan 28), and American Airlines (Feb 10) flights are stored with dates, but the JetBlue flight has no date recorded, making it impossible to confirm it was the earliest without that information.
