# Chromium build

We ship our own headless build of Chromium which is significantly smaller than
the standard binaries shipped by Google. The scripts in this folder can be used
to accept a commit hash from the Chromium repository, and initialize the build
on Ubuntu Linux.

## Why do we do this

By default, Puppeteer will download a zip file containing the Chromium browser for any
OS. This creates problems on Linux, because Chromium has a dependency on X11, which
is often not installed for a server environment. We don't want to make a requirement
for Linux that you need X11 to run Kibana. To work around this, we create our own Chromium
build, using the
[`headless_shell`](https://chromium.googlesource.com/chromium/src/+/5cf4b8b13ed518472038170f8de9db2f6c258fe4/headless)
build target. There are no (trustworthy) sources of these builds available elsewhere.

Fortunately, creating the custom builds is only necessary for Linux. When you have a build
of Kibana for Linux, or if you use a Linux desktop to develop Kibana, you have a copy of
`headless_shell` bundled inside. When you have a Windows or Mac build of Kibana, or use
either of those for development, you have a copy of the full build of Chromium, which
was downloaded from the main [Chromium download
location](https://commondatastorage.googleapis.com/chromium-browser-snapshots/index.html).

## Build Script Usage

Note that a git commit hash for Chromium is required for the build.  This is obtained
by running the following, which
will print various info, including the git commit hash. 

```sh
$ node scripts/chromium_version.js <puppeteer version>
```

The system OS requires a few setup steps:
1. Required packages: `bzip2`, `git`, `lsb_release`, `python3`
2. Use `python3` vs `python` (v2)
3. Recommended: `tmux`, as your ssh session may get interrupted

These commands show how to set up an environment to build:

```sh
# Install pre-req tools
sudo apt update
sudo apt-get install -y bzip2 git lsb_release python3 binutils pkg-config gperf

# Allow our scripts to use depot_tools commands
export PATH=$HOME/chromium/depot_tools:$PATH

# Create a dedicated working directory for this directory of Python scripts.
mkdir ~/chromium && cd ~/chromium

# Copy the scripts from the Kibana team's GCS bucket
gsutil cp -r gs://headless_shell_staging/build_chromium .

# Install the OS packages, configure the environment, download the chromium source (25GB)
python3 ./build_chromium/init.py

# Run the build script with the Chromium git commit hash and architecture
# Takes about 30 minutes.
python3 ./build_chromium/build.py 70f5d88ea95298a18a85c33c98ea00e02358ad75 x64

# The build often fails at the last step when copying files to the staging
# bucket, and if so, you need to copy them manually (see Artifacts below)
# before doing another build, which will erase the files.

# Then you can build for ARM
python3 ./build_chromium/build.py 70f5d88ea95298a18a85c33c98ea00e02358ad75 arm64
```

**NOTE:** The `init.py` script updates git config to make it more possible for
the Chromium repo to be cloned successfully. If checking out the Chromium fails
with "early EOF" errors, the instance could be low on memory or disk space.

When bumping the Puppeteer version, make sure you also update the `ChromiumArchivePaths.revision` variable in
`x-pack/platform/plugins/private/reporting/server/browsers/chromium/paths.ts`.

In some cases the revision number might not be available for the darwin or windows builds in `https://commondatastorage.googleapis.com/chromium-browser-snapshots/index.html`. For example, 1181205 was not available for darwin arm64 or windows. In that case, the next available revision numbers 1181286 and 1181280 were used. 

## Build args

A good how-to on building Chromium from source is
[here](https://chromium.googlesource.com/chromium/src/+/master/docs/get_the_code.md).

We have an `linux/args.gn` file that is automatically copied to the build target directory.

To get a list of the build arguments that are enabled, install `depot_tools` and run
`gn args out/headless --list` from the `chromium/src` directory. It prints out all of the flags and their
settings, including the defaults. Some build flags are documented
[here](https://www.chromium.org/developers/gn-build-configuration).

**NOTE:** Please, make sure you consult @elastic/kibana-security before you change, remove or add any of the build flags.

## Artifacts

After the build completes, there will be a .zip file and a .md5 file in `~/chromium/chromium/src/out/headless`. These are named like so: `chromium-{first_7_of_SHA}-{platform}-{arch}`, for example: `chromium-4747cc2-linux-x64`.
The zip files and md5 files are copied to a **staging** bucket in GCP storage.

Note these files are "cleaned" after you start another build, so you should ensure the 
artifacts get copied to the cloud staging folder before starting another build.

The build often fails with a permission error at the last step of the build where
it copies these files.  Instead, you can copy the files to your local machine,
then copy them to the staging directory, all from your local machine.

```sh
$ export VM_NAME=pmuellr-rd-build-chromium-linux-20250918-203527
$ export VM_PATH=/home/pmuellr/chromium/chromium/src/out/headless
$ gcloud compute scp --zone "us-central1-a" --project "elastic-kibana-184716" $VM_NAME:$VM_PATH/chromium-"*" .
...
$ gsutil cp chromium-* gs://headless_shell_staging
...
```

When all the artifacts are in the staging bucket, you copy them all to the `headless_shell` bucket.

```sh
gsutil cp gs://headless_shell_staging/chromium-67649b1-* gs://headless_shell/
```

IMPORTANT: Do not replace builds in the `headless_shell` bucket that are referenced in an active Kibana branch. CI tests on that branch will fail since the archive checksum no longer matches the original version.

## Testing
Search the Puppeteer Github repo for known issues that could affect our use case, and make sure to test anywhere that is affected.

Here's the steps on how to test a Puppeteer upgrade, run these tests on Mac, Windows, Linux x64 and Linux arm64:

- Make sure the Reporting plugin is fetching the correct version of the browser
  at start-up time, and that it can successfully unzip it and copy the files to
  `x-pack/platform/plugins/private/reporting/chromium`
- Make sure there are no errors when using the **Reporting diagnostic tool**
- All functional and API tests that generate PDF and PNG files should pass.
- Use a VM to run Kibana in a low-memory environment and try to generate a PNG of a dashboard that outputs as a 4MB file. Document the minimum requirements in the PR.

## Testing Chromium upgrades on a Windows Machine

Create a Windows Server VM at GCloud.  There is an an instance template instance-template-20250130-215334-pmuellr-windows you can create a VM from, here: 
https://console.cloud.google.com/compute/instanceTemplates/list?inv=1&invt=Aboq_Q&project=elastic-kibana-184716 

Instead of using SSH to connect, you’ll use Remote Desktop (RDP) to open a terminal.  You’ll end up downloading an `.rdp` file, which you can open with the Windows App app (yes, the name of the Mac app is “Windows App”).  When you create the VM, you’ll need to reset the password, which you will need when you connect with RDP.  In addition, the ip address will change each time you restart, so you will need to “edit” the “Device” (the `.RDP` file) from the Windows App to set the ip address.  You should also go in Windows App settings, to set the Credentials from the newly reset password (and the userid you selected).  You can then select this credential in the “Device” settings.  The Device settings also let you set the Redirect folder (under Folders).

Install nvm via https://github.com/coreybutler/nvm-windows/releases - download the `nvm-setup.exe` program.

Get the version of node this branch on your local laptop is using, via:

```sh
$ cat .nvmrc
20.18.2
```

Now install that version of node on Windows:

```sh
$ nvm install 20.18.2
$ nvm use 20.18.2
```

From the branch on your local laptop, find the relevant ES build via  yarn es snapshot

```sh
$ yarn es snapshot 
yarn run v1.22.22
_ node scripts/es snapshot --license trial
 info Installing from snapshot
 info version: 9.1.0
 info install path: /Users/pmuellr/Projects/elastic/kibana-puppeteer-24.1.1/.es/9.1.0
 info license: trial
 info Downloading snapshot manifest from  https://storage.googleapis.com/kibana-ci-es-snapshots-daily/9.1.0/manifest-latest-verified.json
 info downloading artifact from https://storage.googleapis.com/kibana-ci-es-snapshots-daily/...
```

The URL at the bottom is what we want.  Copy that and open the Edge browser in Windows and paste it in the URL bar.  From there, select the URL for the windows build, and download to Windows, then unpack.

Do a build on your Mac:

```sh
$ node scripts/build \
  --all-platforms \
  --skip-os-packages \
  --skip-canvas-shareable-runtime \
  --skip-docker-contexts \
  --skip-cdn-assets \
  --skip-docker-ubi \
  --skip-docker-wolfi \
  --skip-docker-fips \
  --release
```

The output we want will be in build/default/kibana-x.y.z-windows-x86_64, but we’ll want a tar.gz of that:

```sh
cd build/default
tar -zcvf kibana-9.1.0-windows-x86_64.tar.gz kibana-9.1.0-windows-x86_64
```

Set your RDP session up with a “redirect folder”, and place the .tar.gz in that folder.  You will need to quit and relaunch RDP after adding the “redirect folder”.  You will eventually be able to see the folder in “My Computer” or such in Windows explorer.  Copy the .tar.gz to a “local” disk, and then unpack with 

```sh
$ tar -zxvf kibana-9.1.0-windows-x86_64.tar.gz 
```

Edit `elastichsearch.yml` as follows:

```yaml
discovery.type: "single-node"
xpack.ml.enabled: false
xpack.security.authc.api_key.enabled: true
```

Change `xpack.security.http.ssl.enabled` from true to false (to run in http instead of https)

Start elasticsearch

```sh
$ cd ${es dir}
$ bin/elasticsearch.bat
...
```

Reset passwords for elastic and kibana_system

```sh
bin/elasticsearch-reset-password.bat -u elastic       # login to Kibana with this, so remember it!
bin/elasticsearch-reset-password.bat -u kibana_system # set in kibana.yml
```

Edit kibana.yml

```yaml
elasticsearch.username: "kibana_system"
elasticsearch.password: "" - get from password reset (see above)
xpack.security.encryptionKey:              "01234567012345670123456701234567"
xpack.encryptedSavedObjects.encryptionKey: "01234567012345670123456701234567"
xpack.reporting.encryptionKey:             "01234567012345670123456701234567"
```

Start kibana

```sh
$ cd ${kibana dir}
$ bin/kibana.bat
...
```

Start a trial, ("Stack Management" > "License Management" > "Start a trial") so that reporting is enabled.  Load a sample dataset, to load a dashboard, view the dashboard, then generate a PDF (with and without printing selected) and PNG

## Resources

The following links provide helpful context about how the Chromium build works, and its prerequisites:

- Tools for Chromium version information: https://omahaproxy.appspot.com/
- https://www.chromium.org/developers/how-tos/get-the-code/working-with-release-branches
- https://chromium.googlesource.com/chromium/src/+/HEAD/docs/linux/build_instructions.md
- Some build-flag descriptions: https://www.chromium.org/developers/gn-build-configuration
- The serverless Chromium project was indispensable: https://github.com/adieuadieu/serverless-chrome/blob/b29445aa5a96d031be2edd5d1fc8651683bf262c/packages/lambda/builds/chromium/build/build.sh