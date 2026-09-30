import { screen, fireEvent, within, waitFor } from '@testing-library/react';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import { i18n } from '@kbn/i18n';
import { setupEnvironment } from '../../__jest__/client_integration/helpers';
import { renderComponentTemplateCreate } from './__jest__/component_template_create.helpers';

describe('probe', () => {
  test('invalid name', async () => {
    // eslint-disable-next-line no-console
    console.log('VALIDATOR', fieldValidators.indexTemplateNameField(i18n)({ value: 'Invalid#Name' } as any));
    const { httpSetup } = setupEnvironment();
    renderComponentTemplateCreate(httpSetup);
    await screen.findByTestId(APP_HEADER_TEST_SUBJECTS.title);
    const nameInput = within(screen.getByTestId('nameField')).getByRole('textbox');
    fireEvent.change(nameInput, { target: { value: 'Invalid#Name' } });
    // eslint-disable-next-line no-console
    console.log('VALUE', (nameInput as HTMLInputElement).value);
    await new Promise((r) => setTimeout(r, 500));
    // eslint-disable-next-line no-console
    console.log('ERRTEXT', Array.from(document.querySelectorAll('.euiFormErrorText')).map((e) => e.textContent));
    // eslint-disable-next-line no-console
    console.log('NEXT disabled', (screen.getByTestId('nextButton') as HTMLButtonElement).disabled);
    fireEvent.click(screen.getByTestId('nextButton'));
    await new Promise((r) => setTimeout(r, 1000));
    // eslint-disable-next-line no-console
    console.log('AFTER', !!screen.queryByTestId('stepLogistics'), !!screen.queryByTestId('stepSettings'), Array.from(document.querySelectorAll('.euiFormErrorText')).map((e) => e.textContent));
    await waitFor(() => expect(true).toBe(true));
  });
});
